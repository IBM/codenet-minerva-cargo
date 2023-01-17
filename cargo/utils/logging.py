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

import logging
from rich.logging import RichHandler

FORMAT = "%(message)s"
logging.basicConfig(
    level="INFO", format=FORMAT, datefmt="[%X]", handlers=[RichHandler(show_path=False)]
)


class Log(object):
    log = logging.getLogger("rich")

    @staticmethod
    def warn(msg: str):
        Log.log.warn(msg, extra={"markup": True})

    @staticmethod
    def info(msg: str):
        Log.log.info(msg, extra={"markup": True})

    @staticmethod
    def debug(msg: str):
        Log.log.debug(msg, extra={"markup": True})

    @staticmethod
    def error(msg: str):
        Log.log.error(msg, extra={"markup": True})
