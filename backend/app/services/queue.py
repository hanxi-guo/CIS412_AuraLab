"""Lightweight in-process job queue for analysis tasks."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
import threading
from queue import Queue
from typing import Callable


class JobQueue:
    def __init__(self) -> None:
        self.queue: "Queue[Callable[[], None]]" = Queue()
        self.worker: threading.Thread | None = None

    def start(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        self.worker = threading.Thread(target=self._run, daemon=True)
        self.worker.start()

    def _run(self) -> None:
        while True:
            job = self.queue.get()
            try:
                job()
            except Exception:  # pylint: disable=broad-except
                # Swallow to keep worker alive; errors handled inside jobs
                pass
            finally:
                self.queue.task_done()

    def enqueue(self, job: Callable[[], None]) -> None:
        self.start()
        self.queue.put(job)


job_queue = JobQueue()
