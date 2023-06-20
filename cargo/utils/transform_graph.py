from ast import Dict, List
from collections import defaultdict, Counter
from copy import deepcopy
from statistics import mode
from ipdb import set_trace

class TransformGraph:
    @classmethod
    def _method_node_to_class_node(cls, method_nodes: List) -> List:
        """
        """
        classes = defaultdict()
        
        for method_node in method_nodes:
            _class = method_node['class']
            
            if _class not in classes:
                class_node = {
                    "id": _class,
                    "methods": {method_node['method']},
                    "method_partitions": [method_node['partition']]
                }
            
            else:
                class_node = classes[_class]
                class_node["methods"].add(method_node['method'])
                class_node["method_partitions"].append(method_node['partition'])
            
            classes[_class] = class_node
        
        # Regroup method partitions to find a class partition assigment. 
        for key, class_node in classes.items():
            classes[key]["methods"] = list(class_node["methods"])
            classes[key]["class_partition"] = mode(class_node['method_partitions'])

        return list(classes.values())

    @classmethod
    def _method_link_to_class_link(cls, method_links: List) -> List:
        """
        """
        links = dict()
        for link in method_links:
            source_class = ".".join(link['source'].split(".")[:-1])
            target_class = ".".join(link['target'].split(".")[:-1])
            if source_class != target_class:
                if (source_class, target_class) not in links:
                    links[(source_class, target_class)] = link
                else:
                    current_link = deepcopy(link)
                    current_link['weight'] += 1
                    links[(source_class, target_class)] = current_link
        
        return list(links.values())


    @classmethod
    def from_method_graph_to_class_graph(cls, method_sdg_as_dict: Dict) -> Dict:
        """
        Translate a method level SDG to a class level SDG.

        Args:
            method_sdg_as_dict (dict): The method level SDG
        
        Returns:
            Dict: The class level SDG.
        """

        class_graph = dict()
        class_sdg_as_dict = deepcopy(method_sdg_as_dict)
        method_nodes = method_sdg_as_dict["nodes"]
        method_links = method_sdg_as_dict["links"]

        class_graph['nodes'] = TransformGraph._method_node_to_class_node(method_nodes)
        class_graph['links'] = TransformGraph._method_link_to_class_link(method_links)

        return class_graph