# Codenet Minerva Cargo

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made-with-python](https://img.shields.io/badge/Made%20with-Python-green.svg)](https://www.python.org/)

Cargo is part of the Minerva project working on refactoring monoliths to microservices. It leverages [Data Gravity Insights](https://github.com/konveyor/tackle-data-gravity-insights) from the Konveyor.io project and provides recommendations for partitioning code taking into account code relationships, data relationships, and database transaction scope.

## CARGO: AI-Guided Dependency Analysis for Migrating Monolithic Applications to Microservices Architecture

#### Paper: [ArXiV Preprint](https://arxiv.org/pdf/2207.11784.pdf)

#### Abstract
CARGO (short for Context-sensitive lAbel pRopaGatiOn) is a novel un-/semi-supervised partition refinement technique that uses a comprehensive system dependence graph built using context and flow-sensitive static analysis of a monolithic application to refine and thereby enrich the partitioning quality of the current state-of-the-art algorithms.

##### Figure 1. Overview of CARGO

<img width="1792" alt="image" src="https://user-images.githubusercontent.com/1433964/182765160-867803a6-05f7-4a26-a52e-424911535106.png">

## Kick-the-tires Instructions (~15 minutes)

The instructions will reproduce the key results in Figure 6 (RQ1), Figure 7 (RQ2), and Table 1 (RQ3).


### Pre-requisites

* A Linux/Mac system with [Docker](http://docker.io).
* [Python](https://www.python.org/downloads/) >= 3.8, and Pip. Tested with Python 3.9.

### Step 1: Set up Data Gravity Insights CLI

We will use [Data Gravity Insights](https://github.com/konveyor/tackle-data-gravity-insights) (aka. DGI) to first build a system dependency graph and persist the graph in a Neo4j.

#### 1.1 Install DGI

DGI is available as PyPi package, you can also install `dgi` using

1. Clone the DGI repository
```
git clone -b changes-from-konveyor-meetup https://github.com/rahlk/tackle-data-gravity-insights 
```


2. Navigate into the repository and install the dgi 
```

cd tackle-data-gravity-insights && pip install --editable -U .
```

This will install the dgi command locally under your home folder in a hidden folder called: ~/.local/bin. If not already, you must add this folder to your PATH with:

```
export PATH=$HOME/.local/bin:$PATH
```


#### 1.2 Creating a Neo4j Docker container

Make sure that your Docker daemon is running, either by starting up the service (on linux) or by opening the desktop application (on mac).

We will need an instance of Neo4j to store the graphs that `dgi` creates. We will start one up in a docker container and set an environment variable to let `dgi` know where to find it.

```bash
docker run -d --name neo4j \
    -p 7474:7474 \
    -p 7687:7687 \
    -e NEO4J_AUTH="neo4j/tackle" \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS=\["apoc"\] \
    neo4j

export NEO4J_BOLT_URL="bolt://neo4j:tackle@localhost:7687"
```

#### Installation complete

We can now use the `dgi` command to load information about an application into a graph database. We start with `dgi --help`. This should produce:

```man
Usage: dgi [OPTIONS] COMMAND [ARGS]...
  Tackle Data Gravity Insights
Options:
  -n, --neo4j-bolt TEXT  Neo4j Bolt URL
  -q, --quiet            Be more quiet
  -v, --validate         Validate but don't populate graph
  -c, --clear            Clear graph before loading
  --help                 Show this message and exit.
Commands:
  c2g    This command loads Code dependencies into the graph
  cargo  This command runs the CARGO algorithm to partition a monolith
  s2g    This command parses SQL schema DDL into a graph
  tx2g   This command loads DiVA database transactions into a graph
```

### Step 2: Setting up a sample application

Get the source for [Daytrader 7](https://github.com/WASdev/sample.daytrader7) :
```
wget -c https://github.com/WASdev/sample.daytrader7/archive/refs/tags/v1.4.tar.gz -O - | tar -xvz -C .
```
_Note - you may need to `brew install wget` or `apt install wget` before running this._

If you would like to build and deploy the application yourself, please consult the instructions in the Daytrader Github repo (https://github.com/WasDev/sample.daytrader7). For convenience, we have provided the `.jar` files in `$REPO_ROOT/jars/daytrader`.

### Step 3: Build a Program Dependency Graph

#### 3.1 Getting facts with DOOP

We first need to run [DOOP](https://bitbucket.org/yanniss/doop/src/master/). For ease of use, DOOP has been pre-compiled and hosted as a docker image at [quay.io/rkrsn/doop-main](https://quay.io/rkrsn/doop-main). We'll use that for this demo.

From the root folder of the project, run the following commands :
```
mkdir -p doop-data/daytrader
docker run -it --rm -v $REPO_ROOT/jars/daytrader:/root/doop-data/input -v $REPO_ROOT/doop-data/daytrader:/root/doop-data/output/ quay.io/rkrsn/doop-main:latest rundoop
```
_Notes:_ 

_1. If you encounter any error above, please rerun the `docker run ...` command_

_2. Running DOOP for the first time may take up to 15 minutes_

#### 3.2 Run DGI code2graph

In this step, we'll run DGI code2graph to populate a Neo4j graph database with various static code interaction features pertaining to object/dataflow dependencies.
```
dgi -c c2g -i $REPO_ROOT/doop-data/daytrader
```
This will take 4-5 minutes. After successful completion, we should see something like this :
```
$ dgi -c c2g -i doop-data/daytrader
    code2graph generator started...
    Verbose mode: ON
    Building Graph...
    [INFO] Populating heap carried dependencies edges
    100%|█████████████████████| 7138/7138 [01:37<00:00, 72.92it/s]
    [INFO] Populating dataflow edges
    100%|█████████████████████| 5022/5022 [01:31<00:00, 54.99it/s]
    [INFO] Populating call-return dependencies edges
    100%|█████████████████████| 7052/7052 [02:26<00:00, 48.30it/s]
    [INFO] Populating entrypoints
    code2graph build complete
```

#### Extracting Database Transactions with Tackle-DiVA

Note that this step is only for applications with database transactions, like Daytrader. In particular, if you are running these steps for `plants`, `jpetstore` or `acmeair` sample applications as part of the "full" evaluation, **skip this step**.

Now we will run [Tackle-DiVA](https://github.com/konveyor/tackle-diva) to extract transactions from Daytrader. DiVA is available as a docker image, so we just need to run DiVA by pointing to the source code directory and the desired output directory.
```
docker run --rm \
  -v $REPO_ROOT/sample.daytrader7-1.4:/app \
  -v $REPO_ROOT:/diva-distribution/output \
  quay.io/konveyor/tackle-diva
```
This should generate a file `transaction.json` containing all discovered transactions. Finally, we run DGI to load these transaction edges into the program dependency graph.
```
dgi -c tx2g -i $REPO_ROOT/transaction.json
```
After successful completion, we should see something like this :
```
Verbose mode: ON
[INFO] Clear flag detected... Deleting pre-existing SQLTable nodes.
Building Graph...
[INFO] Populating transactions
100%|████████████████████| 158/158 [00:01<00:00, 125.73it/s]
Graph build complete
```

### Step 4: Running CARGO

Once we have created the Neo4j graphs by following the above steps, we can run CARGO as follows:

```
dgi partition --partitions=5
```

