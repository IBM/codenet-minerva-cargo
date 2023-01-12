################################################################################
# Copyright IBM Corporate 2022
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
################################################################################

import networkx as nx

import glob
import argparse, os, random
import json, re, ast

import numpy as np

from pathlib import Path
from copy import deepcopy
from py2neo import Graph
from ipdb import set_trace

import pandas as pd
from tabulate import tabulate
from .utils import Log

from collections import namedtuple
from urllib.parse import urljoin, urlencode, urlparse, urlunparse

from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

from .helper import *
from .metrics import Metrics
# Define custom progress bar
progress_bar = Progress(
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    BarColumn(),
    MofNCompleteColumn(),
    TextColumn("•"),
    TimeElapsedColumn(),
    TextColumn("•"),
    TimeRemainingColumn(),
)



class Cargo(object):
    
    def __init__(self, use_dgi: bool, dgi_neo4j_usehttps: bool, dgi_neo4j_hostname: str, dgi_neo4j_hostport: int, dgi_neo4j_auth: str, verbose: bool):
        # namedtuple to match the internal signature of urlunparse
        Components = namedtuple(typename='Components', field_names=['scheme', 'netloc', 'url', 'path', 'query', 'fragment'])
        url = urlunparse(
            Components(
            scheme='https' if dgi_neo4j_usehttps else "bolt",
            netloc= "%s:%s" % (dgi_neo4j_hostname,dgi_neo4j_hostport),
            query=None,
            path='',
            url='',
            fragment='')
        )
        if use_dgi:
            self.graph: nx.MultiDiGraph = self.dgi2networkx(url, dgi_neo4j_auth)



    def dgi2networkx(self, neo4j_url: str, dgi_neo4j_auth: str) -> nx.MultiDiGraph:

        Log.info("Loading graphs from Neo4j.")
        set_trace()
        graph   = Graph(neo4j_url, auth=tuple(dgi_neo4j_auth.split(":")))
        cursor  = graph.run('Match (n)-[r]->(m) Return n,r,m;')
        num_records = len(cursor.data())
        self.full_G             = nx.MultiDiGraph()
        self.all_context_graphs = []
        self.transaction_graph  = nx.MultiDiGraph()
        all_contexts            = []

        with progress_bar as p:
            for record in p.track(cursor, total=num_records):

                if 'SQLTable' in record['n'].labels:
                    node1 = 'DATABASE_' + record['n']['name']
                    node2 = record['m']['node_class']
                    self.transaction_graph.add_edge(node2, node1)
                    continue

                if 'SQLTable' in record['m'].labels:
                    node1 = record['n']['node_class']
                    node2 = 'DATABASE_' + record['m']['name']
                    self.transaction_graph.add_edge(node1, node2)
                    continue

                node1   = record['n']['node_class']
                node2   = record['m']['node_class']

                if is_java_method(node1) or is_java_method(node2):
                    continue

                if node1 == node2:
                    continue

                def transform_ctx(ctx):
                    if isinstance(ctx, list):
                        return '[' + ', '.join(ctx) + ']'
                    else:
                        assert isinstance(ctx, str)
                        return ctx

                if 'ncontext' in record['r']:
                    ctx1    = transform_ctx(record['r']['pcontext'])
                    ctx2    = transform_ctx(record['r']['ncontext'])
                else:
                    ctx1    = transform_ctx(record['r']['context'])
                    ctx2    = transform_ctx(record['r']['context'])

                if ctx1 not in all_contexts:
                    all_contexts.append(ctx1)
                    self.all_context_graphs.append(nx.MultiDiGraph())

                if ctx2 not in all_contexts:
                    all_contexts.append(ctx2)
                    self.all_context_graphs.append(nx.MultiDiGraph())

                ctx1_num = all_contexts.index(ctx1)
                ctx2_num = all_contexts.index(ctx2)

                add_edge_weighted(self.full_G, (node1, node2, {}))

                add_edge_weighted(self.all_context_graphs[ctx1_num], (node1, node2, {}))
                add_edge_weighted(self.all_context_graphs[ctx2_num], (node1, node2, {}))

        for context_G in self.all_context_graphs:
            for node in self.full_G.nodes:
                if node not in context_G:
                    context_G.add_node(node)


    def assign_init_labels(self, G, init_labels, max_part, labels_file=None):

        partitions = nx.get_node_attributes(G, 'partition')

        if len(partitions) > 0:
            num_partitions = max(partitions.values()) + 1
        else:
            num_partitions = 0

        if init_labels == 'unique':

            running_count = 0

            if max_part == -1:
                for node in G.nodes:
                    if node not in partitions:
                        G.nodes[node]['partition']  = running_count
                        running_count               += 1
            else:
                assert num_partitions <= max_part

                for node in G.nodes:
                    if node not in partitions:
                        assert num_partitions <= max_part
                        G.nodes[node]['partition']  = running_count % max_part
                        running_count               = (running_count + 1) % max_part

        elif init_labels == 'file':

            if labels_file == None:
                raise Exception ("File name must be provided if init_labels='file'")

            assert labels_file[-5:] == '.json'

            with open(labels_file, 'r') as f:
                file_assignments = json.load(f)

            class_name_list = list(file_assignments.keys())

            for class_name in class_name_list:
                if "::" in class_name:
                    assignment = file_assignments.pop(class_name)
                    file_assignments[class_name.replace("::", "$")] = assignment

            matched = {key : False for key in file_assignments.keys()}

            for node in G.nodes:
                class_name = node.split(':')[0].strip(' <>').split('.')[-1]

                if class_name in file_assignments:

                    matched[class_name] = True
                    partitions          = nx.get_node_attributes(G, 'partition')

                    if node not in partitions:
                        G.nodes[node]['partition'] = file_assignments[class_name]
                    else:
                        raise Exception ("If `init_labels == file`, there should be no existing partitions")

            num_matched = sum(matched.values())

            print("Matched {}/{} from the partition file to {}/{} in the program graph".format(num_matched, len(file_assignments), len(nx.get_node_attributes(G, 'partition')), len(G.nodes)))

            partitions  = nx.get_node_attributes(G, 'partition')
            if len(partitions.values()) != 0:
                num_part    = max(partitions.values()) + 1
            else:
                num_part    = 1

            if max_part != -1:
                assert num_part <= max_part

            # If too few of the nodes are labelled, random init the rest
            if (len(partitions) / float(len(G.nodes))) <= 0.10:
                raise Exception("Only {} out of {} nodes were initialized from the file".format(len(partitions), len(G.nodes)))
                # print("Doing random init for the remaining nodes")
                # self.assign_init_labels(G, 'unique', max_part)

        else:
            raise NotImplementedError


    def label_propagation(self, G):

        node_labels = nx.get_node_attributes(G, 'partition')

        num_partitions = max(node_labels.values()) + 1

        assert len(node_labels) == len(G.nodes)
        assert max(node_labels.values()) >= 0

        while True:
            active = False

            nodes = list(G.nodes())

            random.shuffle(nodes)

            for node in nodes:

                label_scores = {i : 0 for i in range(max(node_labels.values()) + 1)}
                label_scores.update({-1 : 0})

                for neighbor in G.neighbors(node):

                    edge = G.get_edge_data(node, neighbor)

                    if 'weight' in edge:
                        label_scores[node_labels[neighbor]] += edge['weight']
                    else:
                        label_scores[node_labels[neighbor]] += 1

                max_candidates = [v for l, v in label_scores.items() if (l != -1) and (v != 0)]

                if len(max_candidates) != 0:
                    max_freq        = max(max_candidates)
                    all_max_labels  = [l for l, v in label_scores.items() if v == max_freq and l != -1]

                    if node_labels[node] not in all_max_labels:
                        node_labels[node]   = random.choice(all_max_labels)
                        active              = True

            if not active:
                break

        # Re-number the nodes
        all_labels  = set(node_labels.values())
        if -1 in all_labels:
            all_labels.remove(-1)
        label_map   = {label : i for i, label in enumerate(all_labels)}
        label_map.update({-1 : -1})

        for node in G.nodes:
            G.nodes[node]['partition'] = label_map[node_labels[node]]


    def prop_db(self, G):

        expanded_G = nx.MultiDiGraph(deepcopy(G))

        for edge in self.transaction_graph.edges(data=True):
            add_edge_weighted(expanded_G, (edge[0], edge[1], {}))

        expanded_G = to_undirected_simple(expanded_G)
        fill_minus_one(expanded_G)

        print("Doing LPA on graph with database edges temporarily added")

        self.label_propagation(expanded_G)

        copy_partitions(expanded_G, G)


    def do_cargo(self, init_labels='unique', max_part=-1, labels_file=None):

        clear_partitions(self.full_G)

        for ctx_graph in self.all_context_graphs:
            clear_partitions(ctx_graph)

        prev_graph = to_undirected_simple(self.full_G)
        self.assign_init_labels(prev_graph, init_labels=init_labels, max_part=max_part, labels_file=labels_file)
        fill_minus_one(prev_graph)

        if self.transaction_graph.number_of_edges() > 0:
            self.prop_db(prev_graph)

        num_ctx     = len(self.all_context_graphs)
        ctx_order   = np.random.permutation(num_ctx)

        for ctx_num in ctx_order:
            curr_graph = to_undirected_simple(self.all_context_graphs[ctx_num])

            fill_minus_one(curr_graph)
            copy_partitions(prev_graph, curr_graph)

            self.label_propagation(curr_graph)

            prev_graph = curr_graph

        labelprop_G = to_undirected_simple(self.full_G)

        fill_minus_one(labelprop_G)
        copy_partitions(curr_graph, labelprop_G)

        partition_freqs = np.array(np.unique(list(nx.get_node_attributes(labelprop_G, 'partition').values()), return_counts=True))
        partition_freqs = np.array(partition_freqs).T
        partition_freqs = {partition : freq for partition, freq in partition_freqs if partition != -1}
        least_freq      = min(partition_freqs, key=partition_freqs.get)

        # num_partitions      = max(nx.get_node_attributes(labelprop_G, 'partition').values()) + 1
        unassigned_count    = 0

        for node in labelprop_G.nodes:
            if labelprop_G.nodes[node]['partition'] == -1:
                labelprop_G.nodes[node]['partition']    = least_freq
                unassigned_count                        += 1

        if unassigned_count > 0:
            print("Warning : {} nodes out of {} were still -1 at the end of Labelprop, and so were assigned to partition {}".format(unassigned_count, len(labelprop_G.nodes), least_freq))

        return labelprop_G


    def compute_metrics(self, G):

        new_G = deepcopy(G)

        metrics: Metrics = Metrics(new_G, self.dataset, self.transaction_graph)
        dataflow_metrics = metrics.compute_dataflow_metrics()
        static_metrics   = metrics.compute_static_metrics()
        all_metrics      = {**dataflow_metrics, **static_metrics}

        if self.transaction_graph.number_of_edges() > 0:
            all_metrics['DB']   = metrics._transaction_entropy()
        else:
            all_metrics['DB']   = 0.0

        return all_metrics


    def get_metrics_from_file(self, labels_file):

        new_G = deepcopy(self.full_G)
        clear_partitions(new_G)
        self.assign_init_labels(new_G, init_labels='file', max_part=-1, labels_file=labels_file)
        self.copy_new_classes_from_file(new_G, labels_file)
        metrics = self.compute_metrics(new_G)

        return metrics


    def copy_new_classes_from_file(self, labelprop_G, labels_file):

        with open(labels_file, 'r') as f:
            init_partitions = json.load(f)

        curr_partitions     = nx.get_node_attributes(labelprop_G, 'partition')
        num_curr_partitions = max(curr_partitions.values()) + 1

        label_remapping     = {i : i for i in range(num_curr_partitions)}
        copy_count          = 0

        for class_name, partition in init_partitions.items():
            new_name = class_name.split('.')[-1].replace('::', '$')

            if not any(new_name == node.split('.')[-1] for node in labelprop_G.nodes):
                # While copying over partitions, maintain continuous numbering
                if partition not in label_remapping:
                    label_remapping[partition]  = num_curr_partitions
                    num_curr_partitions        += 1

                copy_count += 1
                node_name   = class_name.replace('::', '$')
                labelprop_G.add_node(node_name)
                labelprop_G.nodes[node_name]['partition']       = label_remapping[partition]
                labelprop_G.nodes[node_name]['node_short_name'] = class_name

        print("Copied {} classes directly from the initial file".format(copy_count))


    def run(self, init_labels, max_part, labels_file=None):

        if init_labels == 'file':
            print("Cargo with {} initial labels".format(labels_file))
        else:
            print("Cargo with {} initial labels".format(init_labels))

        labelprop_G     = self.do_cargo(init_labels, max_part, labels_file)
        assignments     = nx.get_node_attributes(labelprop_G, 'partition')
        
        if init_labels == 'file':
            self.copy_new_classes_from_file(labelprop_G, labels_file)

            with open(labels_file, 'r') as f:
                init_partitions = json.load(f)

            num_init_partitions = max(init_partitions.values()) + 1
            num_gen_partitions  = max(assignments.values()) + 1

            print("Max partitions : {}, File partitions : {}, Gen partitions : {}".format(max_part, num_init_partitions, num_gen_partitions))
            print("Init partition sizes : {}".format(np.unique(list(init_partitions.values()), return_counts=True)[1]))
        else:
            num_gen_partitions = max(assignments.values()) + 1
            print("Max partitions : {}, Gen partitions : {}".format(max_part, num_gen_partitions))

        partition_sizes = np.unique(list(assignments.values()), return_counts=True)[1]
        print("Final partition sizes : {}".format(partition_sizes))

        metrics = self.compute_metrics(labelprop_G)

        print("Metrics : ")
        print(metrics)

        clear_partitions(labelprop_G)

        return metrics
        