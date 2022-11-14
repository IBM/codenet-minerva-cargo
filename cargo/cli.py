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

from typing import Tuple
import typer
from .cargo import Cargo
app = typer.Typer(help="A data-centric transformation of monoliths into microservices.", add_completion=False, add_help_option=True) 

@app.command('cargo')
def cli(    
        seed_partition: str = typer.Option("",  rich_help_panel="Options", help="Initial/seed paritions as JSON"),
        output: str = typer.Option("partitions.json", rich_help_panel="Options", help="The JSON file to containing partition ids."),
        use_dgi: bool = typer.Option(True,  rich_help_panel="DGI Options", help="Use DGI graphs", is_flag=True, show_default=True),
        dgi_neo4j_usehttps: bool = typer.Option(False, rich_help_panel="DGI Options", help="Use https instead of bolt."),
        dgi_neo4j_hostname: str = typer.Option("localhost", rich_help_panel="DGI Options", help="Hostname of the DGI graph."),
        dgi_neo4j_hostport: int = typer.Option(7687, rich_help_panel="DGI Options", help="Neo4j bolt host port number."),
        dgi_neo4j_auth: str = typer.Option("neo4j:tackle", rich_help_panel="DGI Options", help="Neo4j authentication. Formatted as \"username:password\"."),
        verbose: bool = typer.Option(False, rich_help_panel="Misc.", help="Be verbose.", is_flag=True, show_default=True)
    ) -> None:
    """ A data-centric transformation of monoliths into microservices.
    """

    cargo = Cargo(use_dgi, dgi_neo4j_usehttps, dgi_neo4j_hostname, dgi_neo4j_hostport, dgi_neo4j_auth, verbose)
