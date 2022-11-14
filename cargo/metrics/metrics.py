import re
import sys
import json
import numpy as np
import pandas as pd
import math
import networkx as nx
from pathlib import Path
from collections import defaultdict
from typing import DefaultDict, NewType, Tuple
from scipy.stats import entropy
import itertools
import os
import itertools
from copy import deepcopy

from .metric_utils import jsonify_context, jsonify_heap_obj, jsonify_method_string, gen_class_assignment, get_call_info

# -- Alisases for type hinting --
DataFrame = NewType("DataFrame", pd.DataFrame)
MultiDiGraph = NewType("MultiDiGraph", nx.classes.multidigraph.MultiDiGraph)

class Metrics:

    def __init__(self, ddg: MultiDiGraph, dataset: str, transaction_graph: MultiDiGraph = None):
        self.ddg = deepcopy(ddg)
        self.transaction_graph = deepcopy(transaction_graph).to_undirected()

        remapping = {}
        for node in self.ddg:
            if len(node.split('.')) > 1:
                remapping[node] = node.split('.')[-1]

        self.ddg = nx.relabel_nodes(self.ddg, remapping)
        self.transaction_graph = nx.relabel_nodes(self.transaction_graph, remapping)

        dir_path = os.path.dirname(os.path.realpath(__file__))

        with open(Path(dir_path).parent.joinpath("resources/{}/bcs_per_class.json".format(dataset)), 'r') as f:
            self.bcs_per_class = json.load(f)

        with open(Path(dir_path).parent.joinpath("resources/{}/runtime_call_volume.json".format(dataset)), 'r') as f:
            self.runtime_call_volume = json.load(f)

        self.bcs_per_class          = {key.replace("::", "$") : value for key, value in self.bcs_per_class.items()}
        self.runtime_call_volume    = {key.replace("::", "$") : value for key, value in self.runtime_call_volume.items()}

        self.partitions = nx.get_node_attributes(self.ddg, 'partition')

        N = max(self.partitions.values()) + 1
        assert all(i in self.partitions.values() for i in range(N))
        assert len(set(self.partitions.values())) == N

    def _static_cohesion(self) -> float:

        N = max(self.partitions.values()) + 1
        # We want partitions to be 0, 1, ..., N-1 without any missing
        assert all(i in self.partitions.values() for i in range(N))
        assert len(set(self.partitions.values())) == N

        _internal_counts = np.zeros(N, dtype=np.float32)
        _external_counts = np.zeros(N, dtype=np.float32)

        for src_class, dst_class, data in self.ddg.edges(data=True):

            if src_class not in self.partitions or dst_class not in self.partitions:
                continue

            weight = data['weight'] if 'weight' in data else 1.0

            src_partition = self.partitions[src_class]
            dst_partition = self.partitions[dst_class]

            if src_partition == dst_partition:
                _internal_counts[src_partition] += weight
            else:
                _external_counts[src_partition] += weight
                _external_counts[dst_partition] += weight

        cohesion = np.mean((2 * _internal_counts) / ((2 * _internal_counts) + _external_counts + 1e-7))

        return np.round(cohesion, 3)


    def _static_coupling(self) -> float:

        intra_partition: int = 0
        extra_partition: int = 0

        for edges in self.ddg.edges(data=True):
            src_class, dst_class, data = edges
            weight = data['weight'] if 'weight' in data else 1.0

            if (src_class not in self.partitions) or (dst_class not in self.partitions):
                if (src_class not in self.partitions) and (dst_class not in self.partitions):
                    intra_partition += weight
                else:
                    extra_partition += weight
                continue

            if self.partitions[src_class] == self.partitions[dst_class]:
                intra_partition += weight
            else:
                extra_partition += weight

        total   = extra_partition + intra_partition + 1e-7
        sipv    = extra_partition / float(total)

        return sipv

    def _business_context_purity(self, partition_class_bcs_assignment, result=None):
        #lower is better
        """ The entropy of business context. """
        if result == None:
            result = partition_class_bcs_assignment

        e = []

        for cls, value in result.items():
            if cls == '-1':
                continue
            counts  = np.unique(value['business_context'], return_counts=True)[1]
            # freqs   = counts / np.sum(counts)
            # ent1    = np.sum(-1.0 * freqs * np.log(freqs))
            ent2    = entropy(counts)
            # assert math.abs(ent1 - ent2) < 0.001
            e.append(ent2)
        return round(np.mean(e), 3)


    def _inter_call_percentage(self, ROOT, class_bcs_partition_assignment, runtime_call_volume, result=None):
        """ The percentage of runtime call between two clusters. """
        #lower is better
        if result == None:
            result = class_bcs_partition_assignment

        n_total = 0
        n_inter = 0
        for call, volume in runtime_call_volume.items():
            src, target = call.split("--")
            if src.lower() == str(ROOT).lower() or target.lower() == str(ROOT).lower():
                continue

            if src == target:
                continue

            if src and target:
                try:
                    src_assignment, target_assignment = result[src]['final'], result[target]['final']
                    n_total += volume
                    if src_assignment != target_assignment:
                        n_inter += volume
                except KeyError:
                    continue

        try:
            r = n_inter * 1.0 / n_total
        except ZeroDivisionError:
            r = float("Inf")

        return round(r, 3)


    def _transaction_entropy(self):

        partition_lists = []
        _entropy = []

        if self.transaction_graph.is_directed():
            self.transaction_graph = self.transaction_graph.to_undirected()

        for node in self.transaction_graph.nodes:
            if 'DATABASE_' in node:
                partition_list = []
                for neighbor in self.transaction_graph.neighbors(node):
                    if neighbor in self.partitions:
                        partition_list += [self.partitions[neighbor]]
                    else:
                        partition_list += [-1]

                partition_lists += [partition_list]
                counts = np.unique(partition_list, return_counts=True)[1]
                _entropy += [entropy(counts)]

        return np.round(np.mean(_entropy), 3)


    def compute_dataflow_metrics(self) -> dict:

        class_bcs_partition_assignment, partition_class_bcs_assignment = gen_class_assignment(self.partitions,self.bcs_per_class)

        bcp = self._business_context_purity(partition_class_bcs_assignment)
        icp = self._inter_call_percentage('Root', class_bcs_partition_assignment, self.runtime_call_volume)

        dataflow_metrics    = {'BCP'    : bcp,
                               'ICP'    : icp,
                              }

        return dataflow_metrics

    def compute_static_metrics(self) -> dict:
        """ Compute all static metrics

        Returns:
            DataFrame: A summary of the metrics
        """

        static_metrics = {'Cohesion'    : self._static_cohesion(),
                          'Coupling'    : self._static_coupling(),
                         }

        return static_metrics
