# Contributing In General

Our project welcomes external contributions. If you have an itch, please feel
free to scratch it.

To contribute code or documentation, please submit a [pull request](https://github.com/ibm/codenet-minerva-cargo/pulls).

A good way to familiarize yourself with the codebase and contribution process is
to look for and tackle low-hanging fruit in the [issue tracker](https://github.com/ibm/codenet-minerva-cargo/issues).
Before embarking on a more ambitious contribution, please quickly [get in touch](#communication) with us.

## Contributing Guidelines

**Note:** _We appreciate your effort, and want to avoid a situation where a contribution requires extensive rework (by you or by us), sits in backlog for a long time, or cannot be accepted at all!_

### Proposing new features

If you would like to implement a new feature, please [raise an issue](https://github.com/ibm/codenet-minerva-cargo/issues)
before sending a pull request so the feature can be discussed. This is to avoid
you wasting your valuable time working on a feature that the project developers
are not interested in accepting into the code base.

### Fixing bugs

If you would like to fix a bug, please [raise an issue](https://github.com/ibm/codenet-minerva-cargo/issues) before sending a
pull request so it can be tracked.

### Merge approval

The project maintainers use LGTM (Looks Good To Me) in comments on the code
review to indicate acceptance. A change requires LGTMs from two of the
maintainers of each component affected.

For a list of the maintainers, see the [MAINTAINERS.md](MAINTAINERS.md) page.

## Legal

Each source file must include a license header for the Apache
Software License 2.0. Using the SPDX format is the simplest approach.
e.g.

```python
##################################################
# Copyright <holder> All Rights Reserved.
# 
# SPDX-License-Identifier: Apache-2.0
##################################################
```

We have tried to make it as easy as possible to make contributions. This applies to how we handle the legal aspects of contribution. We use the same approach - the [Developer's Certificate of Origin 1.1 (DCO)](https://github.com/hyperledger/fabric/blob/master/docs/source/DCO1.1.txt) - that the Linux® Kernel [community](https://elinux.org/Developer_Certificate_Of_Origin)
uses to manage code contributions.

We simply ask that when submitting a patch for review, the developer must include a sign-off statement in the commit message.

Here is an example Signed-off-by line, which indicates that the
submitter accepts the DCO:

```
Signed-off-by: John Doe <john.doe@example.com>
```

You can include this automatically when you commit a change to your local git repository using the following command:

```
git commit -s
```

## Communication

**TODO** This needs be updated when we have a [Slack channel](link).

## Setup

To easily on-board developers, this project uses [Docker Desktop](https://www.docker.com/products/docker-desktop) and [Visual Studio Code](https://code.visualstudio.com) with the [Remote Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension from the Visual Studio Marketplace to provide a consistent repeatable disposable development environment.

To bring up the development environment you should install the prerequisite software and then clone this repo, change into the repo directory and start VSCode with the `code .` command. This tells Visual Studio Code to open the editor and load the current folder of files. When prompted to Re-open Project in Container answer Yes.

Once the environment is loaded you should be placed at a `zsh` prompt in the `/app` folder inside of the development container. This folder is mounted to the current working directory of your repository on your computer. This means that any file you edit while inside of the `/app` folder in the container is actually being edited on your computer. You can then commit your changes to `git` from either inside or outside of the container. A Neo4J database instance will also be provided running ina  Docker container.

Please refer to the [README.md](README.md) for detailed instructions on using the tool.

## Testing

Test cases are written using PyUnit/Unittest and can be found in the `/tests` folder. Please be sure to add test cases for any code that you write.

## Coding style guidelines

This project is written in Python and all code submissions are expected to be compliant with the [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/).

You can use the following [flake8](https://pypi.org/project/flake8/) and [pylint](https://pypi.org/project/pylint/) commands to check your code:

```bash
# check if there are Python syntax errors or undefined names
flake8 cargo --count --select=E9,F63,F7,F82 --show-source --statistics

# check for PEP8 violations. The GitHub editor is 127 chars wide
flake8 cargo --count --max-complexity=10 --max-line-length=127 --statistics

# Run pylint on the service allowing 127 char lines
pylint cargo --max-line-length=127
