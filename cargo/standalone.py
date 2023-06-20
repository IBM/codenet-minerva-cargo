from pathlib import Path
import click
import json
from cargo import Cargo

@click.command()
@click.option('--max-partitions', '-k', default=-1, type=int, help='The maximum number of partitions')
@click.option('--app-dependency-graph', '-i', type=click.Path(exists=True), 
              help='Path to the input JSON file. This is a System Dependency Graph, '
              'you can use the tool from https://github.com/konveyor/dgi-code-analyzer '
              'to get the system dependency graph of an application.')
@click.option('--seed-partitions', '-s', type=click.Path(exists=True), default = None, help='Path to the initial seed partitions JSON file')
@click.option('--output', '-o', type=click.Path(path_type=Path), default = Path.cwd(), help='Path to save the output JSON file')
def minerva_cargo(max_partitions, app_dependency_graph, seed_partitions, output):
    """
    CLI version of CARGO a un-/semi-supervised partition refinement technique that uses a system dependence 
    graph built using context and flow-sensitive static analysis of a monolithic application.
    """

    if seed_partitions is None:
        seed_partitions = 'auto'

    cargo = Cargo(json_sdg_path=app_dependency_graph)
    _, method_partitions, class_partitions = cargo.run(
        init_labels=seed_partitions,
        max_part=max_partitions)

    with open(output.joinpath('method_partitions.json'), 'w') as partitions_file:
        json.dump(method_partitions, partitions_file, indent=4, sort_keys=False)
    
    with open(output.joinpath('class_partitions.json'), 'w') as partitions_file:
        json.dump(class_partitions, partitions_file, indent=4, sort_keys=False)
    

def main():
    minerva_cargo()

if __name__ == '__main__':
    main()
