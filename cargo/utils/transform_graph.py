################################################################################
# Copyright IBM Corporate 2023
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

from ast import Dict, List
from collections import defaultdict, Counter
from statistics import mode, mean, variance
from math import log2
from ipdb import set_trace
import re
from mo_sql_parsing import parse


class TransformGraph:
    nodes = Dict()
    links = Dict()
    max_partitions = -1

    @classmethod
    def _transactions_to_graph(cls, transactions_as_dict: Dict):
        """ """

        def __extract_class_and_method_names(input_string):
            # Regular expression pattern to find the class and method names
            pattern = "L(.*?), (.*?)[(]"
            match = re.search(pattern, input_string)
            if match:
                # Class and method names found
                class_name = match.group(1).replace("/", ".")
                method_name = match.group(2)
                return class_name, method_name
            else:
                # No class or method name found
                return None, None

        for transaction_entity in transactions_as_dict:
            if transaction_entity["transactions"]:
                for transaction in transaction_entity["transactions"]:
                    for txn in transaction["transaction"]:
                        if txn["sql"] in ["BEGIN", "COMMIT", "ROLLBACK"]:
                            continue

                        class_name, method_name = __extract_class_and_method_names(
                            txn["stacktrace"][-1]["method"]
                        )

                        sql_str = txn["sql"].replace("?", "PLACEHOLDER")
                        try:
                            parsed_sql = parse(sql_str)
                            if "from" in parsed_sql.keys():
                                txn_type = "READ"
                                db_table = parsed_sql["from"]["value"].upper()
                                if db_table not in cls.nodes:
                                    cls.nodes[db_table] = {
                                        "name": db_table,
                                        "type": "SQLTable",
                                        "centrality": 0,
                                        "children": [],
                                    }
                                if (class_name, db_table, txn_type) not in cls.links:
                                    cls.links[(class_name, db_table, txn_type)] = {
                                        "source": db_table,
                                        "target": class_name,
                                        "children": [
                                            {
                                                "source": db_table,
                                                "target": ".".join(
                                                    [class_name, method_name]
                                                ),
                                            }
                                        ],
                                        "weight": 1,
                                        "type": txn_type,
                                    }
                                else:
                                    found = False
                                    for children in cls.links[
                                        (class_name, db_table, txn_type)
                                    ]["children"]:
                                        if (
                                            ".".join([class_name, method_name])
                                            in children["target"]
                                        ):
                                            cls.links[(class_name, db_table, txn_type)][
                                                "weight"
                                            ] += 1
                                            found = True
                                    if not found:
                                        cls.links[(class_name, db_table, txn_type)][
                                            "children"
                                        ].append(
                                            {
                                                "source": db_table,
                                                "target": ".".join(
                                                    [class_name, method_name]
                                                ),
                                            }
                                        )

                            if "update" in parsed_sql.keys():
                                txn_type = "WRITE"
                                db_table = parsed_sql["update"].upper()
                                if db_table not in cls.nodes:
                                    cls.nodes[db_table] = {
                                        "id": db_table,
                                        "type": "SQLTable",
                                        "methods": [],
                                        "centrality": 0,
                                        "method_partitions": [None],
                                    }
                                if (class_name, db_table, txn_type) not in cls.links:
                                    cls.links[(class_name, db_table, txn_type)] = {
                                        "source": class_name,
                                        "target": db_table,
                                        "children": [
                                            {
                                                "target": db_table,
                                                "source": ".".join(
                                                    [class_name, method_name]
                                                ),
                                            }
                                        ],
                                        "weight": 1,
                                        "type": txn_type,
                                    }
                                else:
                                    found = False
                                    for children in cls.links[
                                        (class_name, db_table, txn_type)
                                    ]["children"]:
                                        if (
                                            ".".join([class_name, method_name])
                                            in children["source"]
                                        ):
                                            cls.links[(class_name, db_table, txn_type)][
                                                "weight"
                                            ] += 1
                                            found = True
                                    if not found:
                                        cls.links[(class_name, db_table, txn_type)][
                                            "children"
                                        ].append(
                                            {
                                                "target": db_table,
                                                "source": ".".join(
                                                    [class_name, method_name]
                                                ),
                                            }
                                        )
                        except:
                            pass

    @classmethod
    def _method_node_to_class_node(cls, method_nodes: List) -> List:
        """ """

        cls.nodes = defaultdict()

        for method_node in method_nodes:
            _class = method_node["class"]

            if _class not in cls.nodes:
                class_node = {
                    "name": _class,
                    "methods": {method_node["method"]},
                    "method_partitions": [method_node["partition"]],
                    "centrality": [method_node["centrality"]],
                    "type": "ClassNode",
                }
                cls.nodes[_class] = class_node

            else:
                class_node = cls.nodes[_class]
                class_node["methods"].add(method_node["method"])
                class_node["centrality"].append(method_node["centrality"])
                class_node["method_partitions"].append(method_node["partition"])

        # Regroup method partitions to find a class partition assigment.
        for key, class_node in cls.nodes.items():
            class_node["children"] = [
                {
                    "name": method_name,
                    "partition": partition,
                    "centrality": centrality,
                    "type": "MethodNode",
                }
                for method_name, partition, centrality in zip(
                    class_node["methods"],
                    class_node["method_partitions"],
                    class_node["centrality"],
                )
            ]
            cls.nodes[key]["class_partition"] = mode(class_node["method_partitions"])
            cls.nodes[key]["centrality"] = mean(class_node["centrality"])
            cls.nodes[key]["uncertainity"] = (
                0
                if len(class_node["method_partitions"]) < 2
                else variance(class_node["method_partitions"])
            )
            cls.max_partitions = max(
                cls.nodes[key]["class_partition"], cls.max_partitions
            )

            del cls.nodes[key]["methods"]
            del cls.nodes[key]["method_partitions"]

    @classmethod
    def _method_link_to_class_link(cls, method_links: List) -> List:
        """ """

        cls.links = defaultdict()

        for link in method_links:
            # Class$1 represents an anonymous inner class, we don't wanna have
            # these under consideration
            source_class = ".".join(link["source"].split(".")[:-1]).split("$")[0]
            # Class$1 represents an anonymous inner class, we don't wanna have
            # these under consideration
            target_class = ".".join(link["target"].split(".")[:-1]).split("$")[0]

            if source_class not in cls.nodes or target_class not in cls.nodes:
                continue

            link_type = link["type"]
            link_weight = link["weight"]
            if source_class != target_class:
                if (source_class, target_class, link_type) not in cls.links:
                    cls.links[(source_class, target_class, link_type)] = {
                        "source": source_class,
                        "target": target_class,
                        "weight": link["weight"],
                        "type": link_type,
                        "children": [
                            {
                                "source": link["source"],
                                "target": link["target"],
                            }
                        ],
                    }

                else:
                    link_weight = cls.links[(source_class, target_class, link_type)][
                        "weight"
                    ]
                    link_weight += 1
                    cls.links[(source_class, target_class, link_type)][
                        "weight"
                    ] = link_weight
                    cls.links[(source_class, target_class, link_type)][
                        "children"
                    ].append(
                        {
                            "source": link["source"],
                            "target": link["target"],
                        }
                    )

    @classmethod
    def _validate_nodes(cls):
        for link in cls.links.values():
            assert (
                link["source"] in cls.nodes.keys()
                and link["target"] in cls.nodes.keys()
            )

    @classmethod
    def from_method_graph_to_class_graph(
        cls, method_sdg_as_dict: Dict, transactions_as_dict: Dict = None
    ) -> Dict:
        """
        Translate a method level SDG to a class level SDG.

        Args:
            method_sdg_as_dict (dict): The method level SDG

        Returns:
            Dict: The class level SDG.
        """

        class_graph = dict()
        method_nodes = method_sdg_as_dict["nodes"]
        method_links = method_sdg_as_dict["links"]

        cls._method_node_to_class_node(method_nodes)
        cls._method_link_to_class_link(method_links)

        if transactions_as_dict is not None:
            cls._transactions_to_graph(transactions_as_dict)

        class_graph["nodes"] = list(cls.nodes.values())
        class_graph["links"] = list(cls.links.values())

        cls._validate_nodes()

        return class_graph
