from typing import Optional
from collections import deque


Q = deque()
S = set()


def queue_push(username) -> bool:
    old_len = len(S)
    S.add(username)
    if old_len != len(S):
        Q.append(username)
        return True
    return False


def queue_pop() -> Optional[str]:
    if not Q:
        return None
    answer = Q.pop()
    S.remove(answer)
    return answer


def queue_remove(*usernames: object) -> bool:
    usernames = set(usernames)
    did_remove = False
    for username in usernames:
        if username in S:
            S.remove(username)
            did_remove = True
    for i in range(len(Q) - 1, -1, -1):
        if Q[i] in usernames:
            del Q[i]
    return did_remove


def queue_scan(max_len: int) -> list[str]:
    return list(Q)[:max_len]


def queue_rank(username) -> Optional[int]:
    try:
        return Q.index(username) + 1
    except ValueError:
        return None


def queue_contains(username) -> bool:
    return username in S

