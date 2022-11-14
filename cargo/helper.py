import networkx as nx
from copy import copy, deepcopy

def is_java_method(meth_name):
    return (meth_name.split('.')[0].strip(' <>') in ['java', 'javax']) or (meth_name in ["<<string-builder>>", "<<string-constant>>", "<<null pseudo heap>>"])

def add_edge(G, full_edge):
    if full_edge not in G.edges(data=True):
        G.add_edge(full_edge[0], full_edge[1], **full_edge[2])


def add_edge_weighted(G, full_edge, interrupt=False):

    # Fix this!! (deepcopy)
    full_edge = deepcopy(full_edge)

    edge_weight = full_edge[2].pop('weight') if 'weight' in full_edge[2] else 1.0

    found_exact_edge    = False
    found_parallel_edge = False

    for u, v, data in G.edges(data=True):
        if (nx.is_directed(G) and (u, v) == (full_edge[0], full_edge[1])) or ((not nx.is_directed(G)) and (((u, v) == (full_edge[0], full_edge[1])) or ((v, u) == (full_edge[0], full_edge[1])))):

            if 'weight' in data:
                weight = data.pop('weight')
            else:
                weight = 1

            found_parallel_edge = True

            if full_edge[2] == data:
                data['weight'] = weight + edge_weight
                found_exact_edge = True
                break
            else:
                data['weight'] = weight

    if not found_exact_edge:
        if found_parallel_edge:
            if not (isinstance(G, nx.MultiDiGraph) or isinstance(G, nx.MultiGraph)):
                print("Warning : Trying to add a parallel edge, but G is not a MultiGraph")

        G.add_edge(full_edge[0], full_edge[1], **full_edge[2], weight=edge_weight)


def add_edge_no_attributes(G, full_edge):

    # Fix this!! (deepcopy)
    u, v, data = deepcopy(full_edge)
    new_weight = data.pop('weight') if 'weight' in data else 1.0
    if 'color' in data:
        data.pop('color')

    if G.has_edge(u, v):
        edge_data = G.get_edge_data(u, v)

        edge_weight = edge_data['weight'] if 'weight' in edge_data else 1.0

        G[u][v]['weight'] = edge_weight + new_weight

    else:
        G.add_edge(u, v, **data, weight=new_weight)


def to_undirected(G):
    undirected_G = nx.MultiGraph()

    for node, data in G.nodes(data=True):
        undirected_G.add_node(node, **data)

    for edge in G.edges(data=True):
        add_edge_weighted(undirected_G, edge)

    return undirected_G

def to_simple(G):
    simple_G = nx.DiGraph() if nx.is_directed(G) else nx.Graph()

    for node, data in G.nodes(data=True):
        simple_G.add_node(node, **data)

    for edge in G.edges(data=True):
        add_edge_no_attributes(simple_G, edge)

    return simple_G

def to_undirected_simple(G):
    G1 = to_undirected(G)
    G1 = to_simple(G1)
    return G1

def copy_partitions(G_from, G_to):

    for node in G_from.nodes:
        if node in G_to.nodes and 'partition' in G_from.nodes[node]:
            G_to.nodes[node]['partition'] = G_from.nodes[node]['partition']

def fill_minus_one(G):

    partitions = nx.get_node_attributes(G, 'partition')

    for node in G:
        if node not in partitions:
            G.nodes[node]['partition'] = -1

def clear_partitions(G):
    for node in G:
        if 'partition' in G.nodes[node]:
            G.nodes[node].pop('partition')

def filter_color(G, color):

    filtered_G = nx.DiGraph() if nx.is_directed(G) else nx.Graph()

    for u, v, data in G.edges(data=True):
        if data['color'] == color:
            add_edge_weighted(filtered_G, (u, v, data))

    return filtered_G

def get_unique_ordered(sequence):
    seen = set()
    return [x for x in sequence if not (x in seen or seen.add(x))]

def parse_ctx(ctx):
    contexts = ctx.split(', ')
    contexts = [c.strip().strip(' []<>') for c in contexts]

    context_list = []

    for context in contexts:
        if context in ['immutable-context', 'immutable-hcontext', 'string-builder', 'string-buffer', 'string-constant']:
            context_list.append(context)
            continue

        try:

            context_dict = {}

            if '/' in context:
                class_and_method = context.split('/')[0].split(':')

                context_dict['class']       = class_and_method[0].strip(' []<>')
                context_dict['method']      = class_and_method[1].strip(' []<>')
                context_dict['heap_obj']    = context.split('/')[1]
                context_dict['instance_id'] = context.split('/')[2]

            else:
                context_dict['class']       = context.split(':')[0]
                context_dict['heap_obj']    = context.split(':')[2]

        except:
            print("Context parsing failed")
            import pdb; pdb.set_trace()

        context_list.append(context_dict)

    assert len(context_list) == 2

    return context_list
