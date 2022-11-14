from setuptools import setup, find_packages

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name='minerva-cargo',
    version='v1-beta',
    url="https://github.com/ibm/codenet-minerva-cargo",
    author="Rahul Krishna",
    description="A data-centric transformation of monoliths into microservices",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(exclude=["tests"]),
    include_package_data=True,
    install_requires=[
        'Click',
        'scipy',
        'numpy',
        'pandas',
        'networkx',
        'tqdm',
        'scikit-learn',
        'tackle-dgi',
        'typer',
        'rich'
    ],
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Environment :: Console',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.9',
    ],
    extras_require={
        "dev": [
            "nose==1.3.7",
            "pinocchio==0.4.3",
            "coverage==6.3.2",
            "pylint==2.13",
            "ipdb"
        ],
    },
    entry_points={
        'console_scripts': [
            'findutils = cargo.cli:cli'
        ],
    },
)
