# CRDT based visits counter
## Decisions made
1. Use grow only CRDT counter.
    To be short: data is merged from all nodes.
    Nodes should be identifed by some identifier

2. Use "full data transfer" strategy for nodes synchronization
Reasons: 1. it's easier 2. it does not require "communication layer" to guarantee message delivery and order. Typically this requirements can be achieved using some kind of message queue (Rabbimq, Kaffa)
but it seems to be overengineering, and makes all "testing installation" significantly larger and harder to make it runnable 3. According to task it's clear that there is not much data, so we can afford to send them all. Cons it's harder to provide synchronization with e.g. fronted
3. We do not try to make it totally "ACID" for perforance reasons. As every message should be handled in persistent storage, and implement smth like 2-phase commit between nodes.
3. Node appearance/disappearance.
Possible scenarious:
appearance: 
we add new node to cluser to scale it
we restore broken node
Removal:
node dies because of some problem
node is removed from cluster for some reason by "ops" (being in actively working state). E.g. maintance or scale down due to reduced workload
node is removed from cluster because of being dead.

All scenarious except of accidental node crash are done by "ops" team, so there should be some tools to do this.
1. We are adding new node to cluster. No problems at all: we need just to ensure unique identifier for it
2. We are starting node after some fixes/restarts/updates. We need to guarantee that it uses same identifier as before. It would be good to gurantee that value it contains, is greater or equal to value associated to this node, but on other nodes 
3. Node just dies. This happens accidentally. So we need to provide a way to minimize data loss problems.
4. Node is removed manually (being in active state). Scenario: we need some other node to "take" data from node that is removing.
So strategy: choose one destination node. Send it "increment" command. Send "removal" command to all nodes, to make them forget about node is removed.
If node being removed, is active, it should stop to do nothing
5. Node is removed by in inactive state. Assume that node can not be fixed (e.g. died HDD), othervise we should use strategy "fix, start and then remove". 
Requirements: minimize data loss. Solution: ask all nodes alive, and find maximal value for node being removed. Choose one node alive "to be destination", and increment it's value. Send "forgot" command to all nodes to forgot value associated with node being removed.
Removal procedure relies on two operations: 
1) find max value for node and increment (????)
2) forget node
Both operations are idempotent, so it's possible to run removal until succeeds.
Possible other strategies to handle node removal: 
Just no nothing. 
pros: most easiest solution
cons: it's not consistent (even in eventuall sence): reason nobody ever synchronize values for node being removed at other nodes. It leaves trash: every node that ever was present in cluster will leave it's data in storage.

