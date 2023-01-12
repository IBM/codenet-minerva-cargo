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

import re
from typing import Dict, List
from collections import defaultdict

METHOD_INFO = defaultdict()

def jsonify_context(raw: str) -> List:
        """ Convert context string to a json string.

        Args:
            ctx_list (str): Doop format context string

        Returns:
            str: JSON string representation of the doop context

        Notes:
            Take the context information from: "[class_name_1/method_name_1/obj_name_1/id1, class_name_2/method_name_2/obj_name_2/id2]"
            And, converts it to the following format:
            "{
                {
                    "class": "class_name_1",
                    "method": "method_name_1",
                    "object": "obj_name_1",
                    "instance": id1,
                },
                {
                    "class": "class_name_2",
                    "method": "method_name_2",
                    "object": "obj_name_2",
                    "instance": id2,
                }
            }"
        """

        raw_str = re.sub("[\[\]]", "", raw)
        raw_ctx_lst = raw_str.split(', ')

        for i, str_el in enumerate(raw_ctx_lst):

            ctx_dict = defaultdict(None)
            if str_el in ("<<system-thread-group>>", "<<main-thread-group>>", "<<main-thread>>", "<<immutable-context>>", "<<immutable-hcontext>>", "<<string-builder>>", "<<string-buffer>>"):
                ctx_dict["class"] = str_el
                ctx_dict["method"] = None
                ctx_dict["type"] = None
                ctx_dict["object"] = None
                ctx_dict["instance"] = 0

            elif "MockObject" in str_el:
                class_name, object_name = *str_el.split("::"),
                ctx_dict["class"] = class_name
                ctx_dict["object"] = object_name
                ctx_dict["instance"] = 0

            else:
                raw_substr = raw_ctx_lst[i].split('/')
                class_name, method_signature = *raw_substr[0][1:-1].split(": "),

                try:
                    method_rtype, method_name, _ = *re.sub("[(:)]", " ", method_signature).split(),
                except ValueError:
                    method_rtype, method_name = *re.sub("[(:)]", " ", method_signature).split(),

                object_name = raw_substr[1]
                instance_id = raw_substr[2]
                ctx_dict["class"] = class_name
                ctx_dict["method"] = method_name
                ctx_dict["type"] = method_rtype
                ctx_dict["object"] = object_name
                ctx_dict["instance"] = instance_id

            raw_ctx_lst[i] = ctx_dict

        return tuple(raw_ctx_lst)

def jsonify_method_string(raw: str) -> Dict:
        """ Convert doop style method information to a json formatted string

        Args:
            raw (str): Method information as a doop style string

        Returns:
            str: JSON string representation of the method information
        """

        # In the method info already exists, use that...
        raw = re.sub("[(:)]", " ", raw[1:-1])
        try:
            class_name, return_type, method_sig, _ = *raw.split(),
        except ValueError:
            class_name, return_type, method_sig = *raw.split(),

        key = "::".join([class_name, method_sig])
        if key in METHOD_INFO:
            method_dict = METHOD_INFO[key]
        else:
            # If not, add a new instance to the dictionary
            method_dict = {
                "name": method_sig,
                "class": class_name,
                "class_short_name": class_name.split(".")[-1],
                "return_type": return_type
            }
            METHOD_INFO[key] = method_dict

        return method_dict

def jsonify_heap_obj(heapobj_str: str) -> str:
    """ Create a JSON string from raw heap object string from doop

    Args:
        heapobj_str (str): Heap object as a string

    Returns:
        str: JSON string
    """
    raw_substr = re.sub("[<>]", "", heapobj_str)
    if raw_substr in {'string-constant', 'string-buffer', 'string-builder', 'java.lang.StringMockObject', 'null pseudo heap', 'main-thread', 'system-thread-group', 'main-thread-group'}:
        heap_obj_dict = {
            "class": raw_substr,
            "class_short_name": None,
            "method": None,
            "object": raw_substr,
            "instance": 0,
        }
    elif "MockObject" in heapobj_str:
        class_name, object_name = *heapobj_str.split("::"),
        method_name = None
        heap_obj_dict = {
            "class": class_name,
            "class_short_name": class_name.split('.')[-1],
            "method": method_name,
            "object": class_name,
            "instance": 0,
        }
    else:

        raw_substr = raw_substr.split('/')
        try:
            class_name, method_signature = raw_substr[0].split(":")
            method_signature = method_signature.strip()
        except:
            try:
                class_name, object_name = raw_substr[0].split(" ")
            except:
                if raw_substr[0].split(" ")[0] == 'method' and raw_substr[0].split(" ")[1] == 'type':
                    return {
                        "class": 'method',
                        "class_short_name": 'method',
                        "method": None,
                        "type": None,
                        "object": 'method',
                        "instance": None
                       }

            if class_name == 'class':
                return {
                    "class": object_name,
                    "class_short_name": object_name.split('.')[-1],
                    "method": None,
                    "type": None,
                    "object": object_name,
                    "instance": None
                   }

        if class_name[:7] == 'handle ':
            class_name = class_name[7:]

        try:
            method_rtype, method_name = *method_signature.split(),
        except ValueError:
            method_name = method_signature.split()[0]
            method_rtype = None,

        if len(raw_substr) == 3:
            if raw_substr[1] == 'invokedynamic_metafactory::apply':
                object_name = raw_substr[2].split(" ")[5].split(':')[0]
                instance_id = None
            else:
                object_name = raw_substr[1].split()[1]
                instance_id = raw_substr[2]
        elif len(raw_substr) == 2:
            object_name = raw_substr[1].split()[1]
            instance_id = None
        elif len(raw_substr) == 1:
            object_name = class_name
            instance_id = None
        else:
            raise Exception

        heap_obj_dict = {
            "class": class_name,
            "class_short_name": class_name.split('.')[-1],
            "method": method_name,
            "type": method_rtype,
            "object": object_name,
            "instance": instance_id
        }

    return heap_obj_dict

def gen_class_assignment(partition, bc_per_class):

    class_bcs_partition_assignment = {}
    partition_class_bcs_assignment = {}
    for key, assignment in partition.items():

        assignment = str(assignment)
        if key not in class_bcs_partition_assignment:
            class_bcs_partition_assignment[key] = {}
            class_bcs_partition_assignment[key]["business_context"] = []

        class_bcs_partition_assignment[key]['final'] = assignment
        if key in bc_per_class:
            bcs = bc_per_class[key]
        else:
            bcs = []
        class_bcs_partition_assignment[key]["business_context"].extend(bcs)

        if assignment not in partition_class_bcs_assignment:
            partition_class_bcs_assignment[assignment] = {}
            partition_class_bcs_assignment[assignment]['classes'] = []
            partition_class_bcs_assignment[assignment]['business_context'] = []

        partition_class_bcs_assignment[assignment]["classes"].append(key)
        partition_class_bcs_assignment[assignment]['business_context'].extend(bcs)
            # [bc for bc in bcs if bc not in partition_class_bcs_assignment[assignment]['business_context']])

    return class_bcs_partition_assignment, partition_class_bcs_assignment

def get_call_info(ROOT, runtime_call_volume):
    call_volume = {}
    nodes = []
    for link in runtime_call_volume:
        src = link.split("--")[0]
        tgt = link.split("--")[1]

        nodes.append(src)
        nodes.append(tgt)

        if src.lower() == str(ROOT).lower() or tgt.lower() == str(ROOT).lower():
            continue

        if src == tgt:
            continue

        #src = link['source']
        #tgt = link['target']
        call_volume[(src, tgt)] = runtime_call_volume[link]

    return list(set(nodes)), call_volume
