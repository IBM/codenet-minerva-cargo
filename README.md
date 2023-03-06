# Codenet Minerva Cargo

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made-with-python](https://img.shields.io/badge/Made%20with-Python-green.svg)](https://www.python.org/)

Cargo is part of the Minerva project working on refactoring monoliths to microservices. It leverages [Data Gravity Insights](https://github.com/konveyor/tackle-data-gravity-insights) from the Konveyor.io project and provides recommendations for partitioning code taking into account code relationships, data relationships, and database transaction scope.

## CARGO: AI-Guided Dependency Analysis for Migrating Monolithic Applications to Microservices Architecture

#### Paper: [ArXiV Preprint](https://arxiv.org/pdf/2207.11784.pdf)

#### Abstract

CARGO (short for Context-sensitive lAbel pRopaGatiOn) is a novel un-/semi-supervised partition refinement technique that uses a comprehensive system dependence graph built using context and flow-sensitive static analysis of a monolithic application to refine and thereby enrich the partitioning quality of the current state-of-the-art algorithms.

##### Figure 1. Overview of CARGO

<img width="1792" alt="image" src="https://user-images.githubusercontent.com/1433964/222553554-ce1f7629-bf22-4432-89b7-cc78d8168119.png">

## Kick-the-tires Instructions (~15 minutes)

The instructions will reproduce the key results in Figure 6 (RQ1), Figure 7 (RQ2), and Table 1 (RQ3).

### Pre-requisites

* A Linux/Mac system with [Docker](http://docker.io).
* [Python](https://www.python.org/downloads/) >= 3.8, and Pip. Tested with Python 3.9.

### Step 0: Clone this repository

1. We'll clone this repository and save it's location for the next steps

```bash 
git clone https://github.com/IBM/codenet-minerva-cargo && cd codenet-minerva-cargo

export REPO_ROOT=$PWD
``` 

### Step 1: Set up Data Gravity Insights CLI

We will use [Data Gravity Insights](https://github.com/konveyor/tackle-data-gravity-insights) (aka. DGI) to first build a system dependency graph and persist the graph in a Neo4j.

#### 1.1 Install DGI

DGI is available as PyPi package, you can also install `dgi` as follows

```sh
pip install -U git+https://github.com/rahlk/tackle-data-gravity-insights 
```

This will install the dgi command locally under your home folder in a hidden folder called: ~/.local/bin. If not already, you must add this folder to your PATH with:

```sh
export PATH=$HOME/.local/bin:$PATH
```

#### 1.2 Creating a Neo4j Docker container

Make sure that your Docker daemon is running, either by starting up the service (on linux) or by opening the desktop application (on mac).

We will need an instance of Neo4j to store the graphs that `dgi` creates. We will start one up in a docker container and set an environment variable to let `dgi` know where to find it.

```bash
docker run -d --name neo4j \
    -p 7474:7474 \
    -p 7687:7687 \
    -e NEO4J_AUTH="neo4j/konveyor" \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS=\["apoc"\] \
    neo4j:4.4.17

export NEO4J_BOLT_URL="neo4j://neo4j:konveyor@localhost:7687"
```

#### Installation complete

We can now use the `dgi` command to load information about an application into a graph database. We start with `dgi --help`. This should produce:

```man
$ dgi --help

 Usage: dgi [OPTIONS] COMMAND [ARGS]...

 Tackle Data Gravity Insights

╭─ Options ───────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ --neo4j-bolt  -n  TEXT  Neo4j Bolt URL                                                                          │
│ --quiet       -q        Be more quiet                                                                           │
│ --validate    -v        Validate but don't populate graph                                                       │
│ --clear       -c        Clear graph before loading                                                              │
│ --help                  Show this message and exit.                                                             │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─ Commands ──────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ c2g            Code2Graph add various program dependencies (i.e., call return, heap, and data) into the graph   │
│ partition      Partition is a command runs the CARGO algorithm to (re-)partition a monolith into microservices  │
│ s2g            Schema2Graph parses SQL schema (*.DDL file) into the graph                                       │
│ tx2g           Transaction2Graph add edges denoting CRUD operations to the graph.                               │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

### Step 2: Setting up a sample application

For rest of this walkthrough, we'll work with [DayTrader8](https://github.com/OpenLiberty/sample.daytrader8).

### Step 3: Build a Program Dependency Graph with DOOP

#### 3.1 Prepare the application

Obtain the sample application WAR file. We'll save this in `extras/demo/doop-in`:

```bash
wget https://github.com/OpenLiberty/sample.daytrader8/releases/download/v1.2/io.openliberty.sample.daytrader8.war --directory-prefix=$REPO_ROOT/extras/demo/doop-in
```

#### 3.2 Getting facts with DOOP

We first need to run [DOOP](https://bitbucket.org/yanniss/doop/src/master/). For ease of use, DOOP has been pre-compiled and hosted as a docker image at [quay.io/rkrsn/doop-main](https://quay.io/rkrsn/doop-main). We'll use that for this demo.

```bash
docker run -it --rm \
  -v $REPO_ROOT/extras/demo/doop-in:/root/doop-data/input \
  -v $REPO_ROOT/extras/demo/doop-out:/root/doop-data/output/ \
  quay.io/rkrsn/doop-main:latest rundoop
```

_Notes:_

_1. If you encounter any error above, please rerun the `docker run ...` command_

_2. Running DOOP for the first time may take up to 15 minutes._


#### 3.3 Run DGI code2graph

In this step, we'll run DGI code2graph to populate a Neo4j graph database with various static code interaction features pertaining to object/dataflow dependencies.

```
dgi -c c2g -a class -i $REPO_ROOT/extras/demo/doop-out
```

This will take 4-5 minutes. After successful completion, we should see something like this :

```bash
❯ dgi -c c2g -a class -i $REPO_ROOT/extras/demo/doop-out
[15:57:56] INFO     code2graph generator started.
           INFO     Verbose mode: ON
           INFO     Building Graph.
           INFO     Class level abstraction.
           WARNING  The option clear is turned ON. Deleting pre-existing nodes.
           INFO     Populating heap carried dependencies edges
  • 100% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ • Completed/Total: 1192/1192 • Elapsed: 0:00:02 • Remaining: 0:00:00
[15:57:58] INFO     Populating dataflow edges
  • 100% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ • Completed/Total: 991/991 • Elapsed: 0:00:01 • Remaining: 0:00:00
[15:58:00] INFO     Populating call-return dependencies edges
  • 100% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ • Completed/Total: 2404/2404 • Elapsed: 0:00:04 • Remaining: 0:00:00
[15:58:04] INFO     Populating entrypoints
           INFO     code2graph build complete
```

#### 3.4 Extracting Database Transactions with Tackle-DiVA

Note that this step is only for applications with database transactions. We will run [Tackle-DiVA](https://github.com/konveyor/tackle-diva) to extract transactions from our application. DiVA is available as a docker image, so we just need to run DiVA by pointing to the *source code directory* of the application and the desired output directory.

1. Let's first get the source code for DayTrader8:

```bash 
wget -c https://github.com/OpenLiberty/sample.daytrader8/archive/refs/tags/v1.2.tar.gz  -O - | tar -xvz -C $REPO_ROOT/extras/demo
```

```bash
docker run --rm \
  -v $REPO_ROOT/extras/demo/sample.daytrader8-1.2:/app \
  -v $REPO_ROOT/extras/demo/txns:/diva-distribution/output \
  quay.io/konveyor/tackle-diva
```

This should generate a file `transaction.json` containing all discovered transactions. Finally, we run DGI to load these transaction edges into the program dependency graph.

```bash
dgi -c tx2g -a class -i $REPO_ROOT/extras/demo/txns/transaction.json
```

After successful completion, we should see something like this :

```bash
❯ dgi -c tx2g -a class -i $REPO_ROOT/extras/demo/txns/transaction.json

[16:05:36] INFO     Verbose mode: ON
           WARNING  The CLI argument clear is turned ON. Deleting pre-existing nodes.
           INFO     ClassTransactionLoader: Populating transactions
  • 100% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ • Completed/Total: 175/175 • Elapsed: 0:00:01 • Remaining: 0:00:00
[16:05:38] INFO     Transactions populated
```

### Step 4: Running CARGO

Once we have created the Neo4j graphs by following the above steps, we can run CARGO as follows:

```
dgi partition --partitions=5
```
