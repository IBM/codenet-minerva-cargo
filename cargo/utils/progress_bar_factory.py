# Fancy Progress Bar
from rich.progress import (
    Progress,
    BarColumn,
    TextColumn,
    SpinnerColumn,
    TimeElapsedColumn,
    MofNCompleteColumn,
    TimeRemainingColumn
)

class ProgressBarFactory:
    @classmethod
    def get_progress_bar(cls, debug=False):
        progress_bar = Progress(
        SpinnerColumn(),
        TextColumn("•"),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        BarColumn(),
        TextColumn("• Completed/Total:"),
        MofNCompleteColumn(),
        TextColumn("• Elapsed:"),
        TimeElapsedColumn(),
        TextColumn("• Remaining:"),
        TimeRemainingColumn())
        if debug:
            progress_bar.disable = True
        return progress_bar

