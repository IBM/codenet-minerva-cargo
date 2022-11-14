import logging
from rich.logging import RichHandler

FORMAT = "%(message)s"
logging.basicConfig(
    level="NOTSET", format=FORMAT, datefmt="[%X]", handlers=[RichHandler()]
)
class Log(object):
    log = logging.getLogger("rich")
    @classmethod
    def info(cls, msg: str):
        cls.log.info(msg, extra={"markup": True})

    @classmethod
    def debug(cls, msg: str):
        cls.log.debug(msg, extra={"markup": True})

    @classmethod
    def error(cls, msg: str):
        cls.log.error(msg, extra={"markup": True})
    
