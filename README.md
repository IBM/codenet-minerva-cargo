# Codenet Minerva Cargo

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made-with-python](https://img.shields.io/badge/Made%20with-Python-green.svg)](https://www.python.org/)
[![PyPI version](https://badge.fury.io/py/minerva-cargo.svg)](https://badge.fury.io/py/minerva-cargo)
[![arXiv](https://img.shields.io/badge/arXiv-2207.11784-b31b1b.svg?style=flat)](https://arxiv.org/abs/2207.11784)

CARGO is part of the Minerva project working on refactoring monoliths to microservices. CARGO (short for Context-sensitive lAbel pRopaGatiOn) is a novel un-/semi-supervised partition refinement technique that uses a comprehensive system dependence graph built using context and flow-sensitive static analysis of a monolithic application to refine and thereby enrich the partitioning quality of the current state-of-the-art algorithms.

##### Figure 1. Overview of CARGO

<img width="1792" alt="image" src="https://user-images.githubusercontent.com/1433964/222553554-ce1f7629-bf22-4432-89b7-cc78d8168119.png">

## Kick-the-tires Instructions (~15 minutes)

For the rest of this instructions, we'll assume your project has been built and you have a JAR file(s) (or WAR/EAR file(s)) in a folder `INPUT`, (optional, but highly recommended) your library dependencies in your project will be in a folder called `DEPENDENCIES`, and finally all the generated JSONs will the loaded from and saved to `ARTIFACTS`. 

```sh
export INPUT=/path/to/input/binaries
export ARTIFACTS=/path/to/input/artifacts
export DEPENDENCIES=/path/to/input/dependencies
```

### 1. Obtain SDG 

To get the SDG of the application, we will use [DGI Code Analyzer](https://github.com/rahlk/dgi-code-analyzer), a Java Static Analysis tool build using [WALA](https://github.com/WALA/WALA). 


```sh
 docker run --rm \
  -v $INPUT:/binaries \
  -v $ARTIFACTS:/output \
  -v $DEPENDENCIES:/dependencies \
  quay.io/rkrsn/code-analyzer:latest
```

You'll see the following output in your console

```log
2023-06-20T20:27:25.712400      [INFO]  Create analysis scope.
2023-06-20T20:27:25.857454      [INFO]  Add exclusions to scope.
2023-06-20T20:27:25.858954      [INFO]  Loading Java SE standard libs.
2023-06-20T20:27:25.999459      [INFO]  Loading popular Java EE standard libs.
2023-06-20T20:27:26.015997      [INFO]  -> Adding dependency derby-10.16.1.1.jar to analysis scope.
2023-06-20T20:27:26.018921      [INFO]  -> Adding dependency spring-boot-2.5.4.jar to analysis scope.
2023-06-20T20:27:26.020195      [INFO]  -> Adding dependency javaee-api-8.0.jar to analysis scope.
2023-06-20T20:27:26.023490      [INFO]  -> Adding dependency javaee-api-7.0.jar to analysis scope.
2023-06-20T20:27:26.025250      [INFO]  -> Adding dependency javax.servlet-api-4.0.1.jar to analysis scope.
2023-06-20T20:27:26.025630      [INFO]  -> Adding dependency jta-1.1.jar to analysis scope.
2023-06-20T20:27:26.026122      [INFO]  -> Adding dependency javax.persistence-api-2.2.jar to analysis scope.
2023-06-20T20:27:26.026427      [INFO]  -> Adding dependency validation-api-2.0.1.Final.jar to analysis scope.
2023-06-20T20:27:26.026899      [INFO]  -> Adding dependency mail-1.4.7.jar to analysis scope.
2023-06-20T20:27:26.027318      [INFO]  -> Adding dependency javax.websocket-api-1.1.jar to analysis scope.
2023-06-20T20:27:26.027784      [INFO]  -> Adding dependency javax.json-api-1.1.4.jar to analysis scope.
2023-06-20T20:27:26.028141      [INFO]  -> Adding dependency javax.ws.rs-api-2.1.1.jar to analysis scope.
2023-06-20T20:27:26.028465      [INFO]  Loading user specified extra libs.
2023-06-20T20:27:26.044673      [INFO]  -> Adding dependency activation-1.1.jar to analysis scope.
2023-06-20T20:27:26.057588      [INFO]  -> Adding dependency derby-10.14.2.0.jar to analysis scope.
2023-06-20T20:27:26.075825      [INFO]  -> Adding dependency javaee-api-8.0.jar to analysis scope.
2023-06-20T20:27:26.097050      [INFO]  -> Adding dependency javax.mail-1.6.0.jar to analysis scope.
2023-06-20T20:27:26.111486      [INFO]  -> Adding dependency jaxb-api-2.3.0.jar to analysis scope.
2023-06-20T20:27:26.125049      [INFO]  -> Adding dependency standard-1.1.1.jar to analysis scope.
2023-06-20T20:27:26.163170      [INFO]  Loading application jar(s).
2023-06-20T20:27:26.171148      [INFO]  -> Adding application daytrader8.jar to analysis scope.
2023-06-20T20:27:26.184572      [INFO]  Make class hierarchy.
2023-06-20T20:27:29.049712      [DONE]  There were a total of 16912 classes of which 155 are application classes.
2023-06-20T20:27:29.124264      [INFO]  Registered 1244 entrypoints.
2023-06-20T20:27:29.141498      [INFO]  Building call graph.
2023-06-20T20:27:46.430851      [DONE]  Finished construction of call graph. Took 18.0 seconds.
2023-06-20T20:27:46.431067      [INFO]  Building System Dependency Graph.
2023-06-20T20:27:46.450459      [INFO]  Pruning SDG to keep only Application classes.
2023-06-20T20:27:51.440773      [DONE]  SDG built and pruned. It has 32120 nodes.
2023-06-20T20:27:55.676598      [DONE]  SDG saved at /output
```

The output JSON will be saved in `$ARTIFACTS/sdg.json`

### 2. Run using Docker

To use CARGO using docker, you can simply call:

```sh
docker run --rm \
  -v $ARTIFACTS:/input \
  -v $ARTIFACTS:/output \
  quay.io/codenet-minerva/codenet-minerva-cargo:latest \
  --max-partitions=5                                 
# Additional options (uncomment to use)
# --max-partitions=5                                 ## Number of desired final partitions.
# --sdg-filename=filename.json                       ## (optionally) use non-default SDG filename.
# --seed-partitions=./path/to/seed/partitions.json   ## (optionally) provide user provided seed partitions.
```

This will produced 2 files: `method_partitions.json` and `class_partitions.json` in the `$ARTIFACTS` folder. 

_Note: In this example, I am saving the partitions in the same folder as the input SDG.json._

### 3. Local usage

CARGO may be used as a CLI tool `minerva-cargo`. To install CARGO, you may use pip as follows

```sh
pip install -U .
````

For system wide install 

```sh
sudo pip install -U .
```
When installed correctly, you'll see the following `--help`

```sh
minerva-cargo --help

Usage: minerva-cargo [OPTIONS]

Options:
  -k, --max-partitions INTEGER    The maximum number of partitions
  -i, --app-dependency-graph-path PATH
                                  Path to the input JSON file. This is a
                                  System Dependency Graph, you can use the
                                  tool from https://github.com/konveyor/dgi-
                                  code-analyzer to get the system dependency
                                  graph of an application.
  -f, --sdg-filename TEXT         Filename JSON file. If you used
                                  https://github.com/konveyor/dgi-code-
                                  analyzer to get the system dependency graph
                                  of an application, then the default filename
                                  is sdg.json
  -s, --seed-partitions PATH      Path to the initial seed partitions JSON
                                  file
  -o, --output PATH               Path to save the output JSON file
  --help                          Show this message and exit.
```
### 3. Run CARGO

To run CARGO, use `minerva-cargo -i /path/to/sdg.json -k <number-of-desired-partitions> -o  /path/to/output/partitions.json`. For example, 

```sh
 minerva-cargo -i $ARTIFACTS/daytrader8.json -k 4 -o $ARTIFACTS
```

This will produced 2 files: `method_partitions.json` and `class_partitions.json` in the `$ARTIFACTS` folder. 

_Note: In this example, I am saving the partitions in the same folder as the input SDG.json._

# License

```License
Copyright IBM Corporate 2023
 
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
    http://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
