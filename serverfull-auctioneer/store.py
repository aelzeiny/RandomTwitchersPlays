from typing import Optional, Tuple
from collections import deque


Q = deque()
S = set()


def queue_push(username) -> None:
    old_len = len(S)
    S.add(username)
    if old_len != len(S):
        Q.append(username)


def queue_pop() -> Optional[str]:
    answer = Q.pop()
    S.remove(answer)
    return answer


def queue_remove(*usernames) -> None:
    usernames = set(usernames)
    for username in usernames:
        if username in S:
            S.remove(username)
    for i in range(len(Q) - 1, -1, -1):
        if Q[i] in usernames:
            del Q[i]


def queue_scan(max_len: int) -> list[str]:
    return list(Q)[:max_len]


def queue_rank(username) -> Optional[int]:
    try:
        return Q.index(username)
    except ValueError:
        return None


def queue_contains(username) -> bool:
    return username in S
