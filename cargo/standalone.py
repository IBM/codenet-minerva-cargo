from pathlib import Path
import click
import json
from .utils.logging import Log
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
    if max_partitions != -1:
        click.echo(f'Max partitions set to: {max_partitions}')
    else:
        click.echo('Max partitions set to default: The algorithm will infer the maximum partitions by itself')

    if app_dependency_graph:
        click.echo(f'App dependency graph path: {app_dependency_graph}')
    else:
        click.echo('App dependency graph path not provided. Exiting.')
        return

    if seed_partitions is not None:
        click.echo(f'Seed partitions path: {seed_partitions}')
    else:
        click.echo('Seed partitions path not provided. Using automatic inference.')
        seed_partitions = 'auto'

    if output:
        click.echo(f'Output path: {output}')
    else:
        click.echo('Output path not provided. Exiting.')
        return

    cargo = Cargo(json_sdg_path=app_dependency_graph)
    _, assignments = cargo.run(
        init_labels=seed_partitions,
        max_part=max_partitions)
    
    with open(output.joinpath('partitions.json'), 'w') as partitions_file:
        json.dump(assignments, partitions_file, indent=4, sort_keys=True)
    

def main():
    minerva_cargo()

if __name__ == '__main__':
    main()
