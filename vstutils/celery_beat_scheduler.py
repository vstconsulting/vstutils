import copy
import heapq

# pylint: disable=import-error,signature-differs
from django_celery_beat.schedulers import DatabaseScheduler
from celery.beat import event_t
from celery.utils.log import get_logger

from .utils import Lock

logger = get_logger(__name__)


class SingletonDatabaseScheduler(DatabaseScheduler):
    scheduler_lock = None
    discarding_overdue_tasks = True

    def _discard_overdue_tasks(self, heappop, heappush):
        """
        Discards overdued tasks on first `tick` function call.
        It emulates executing overdued task,
        uses standart `populate_heap` function
        where overdued tasks have higher priority and
        therefore they are first in heap.

        :return: preferred delay in seconds for next tick call.
        :rtype: ``int``
        """
        if (self._heap is None or
                not self.schedules_equal(self.old_schedulers, self.schedule)):
            self.old_schedulers = copy.copy(self.schedule)
            self.populate_heap()

        events_heap = self._heap

        if not events_heap:
            return self.max_interval

        for _i in range(len(events_heap)):
            event = events_heap[0]
            entry = event[2]
            is_due, next_time_to_run = self.is_due(entry)
            if not is_due:
                break
            verify = heappop(events_heap)
            if verify is event:
                next_entry = self.reserve(entry)
                self._tasks_since_sync += 1
                if self.should_sync():
                    self._do_sync()
                logger.info(f'{entry.task} task discarded!')
                heappush(events_heap, event_t(self._when(next_entry, next_time_to_run),
                                              event[1], next_entry))
        return 0

    # pylint: disable=redefined-outer-name
    def tick(self, heappop=heapq.heappop, heappush=heapq.heappush, *args, **kwargs):
        """
        Run a tick - one iteration of the scheduler.
        Discards overdued tasks on first call.
        Executes one due task per call.

        :return: preferred delay in seconds for next tick call.
        :rtype: ``int``
        """
        if self.discarding_overdue_tasks:
            self.discarding_overdue_tasks = False
            return self._discard_overdue_tasks(heappop, heappush)

        if self.scheduler_lock is None:
            try:
                self.scheduler_lock = Lock(Lock.SCHEDULER, timeout=120.0)
            except Lock.AcquireLockException:
                return 60.0
        self.scheduler_lock.prolong()
        return super().tick(event_t, min, heappop, heappush)

    def close(self):
        if self.scheduler_lock is not None:
            self.scheduler_lock.release()

        return super().close()
