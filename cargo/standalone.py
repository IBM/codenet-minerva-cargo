import json
import sys
from cargo import Cargo
from ipdb import set_trace

if __name__ == "__main__":
    args = sys.argv
    path_to_sdg_json = args[1]
    cargo = Cargo(json_sdg_path=path_to_sdg_json)
    metrics, assignements = cargo.run(
        init_labels='auto',
        max_part=3
        )
    print(json.dumps(assignements, indent=4))
    print(json.dumps({name: str(key) for name, key in metrics.items()}, indent=4))