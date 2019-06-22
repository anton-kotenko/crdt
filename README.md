## CRDT-counter based video hosting visits counter
TODO: Need to implement simple example implementation of whole projects.
Design goals: it should be simple enough, but show basic features how CRDT counter works.

Generally it's possible to implement CRDT counter in two ways: as
`Operation-based: commutative replicated data types, or CmRDTs`
`State-based: convergent replicated data types, or CvRDTs`
(see https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)

Operation-based looks better in terms of performance, but it is more complex
1. it requires order and delivery guarantees from communication layer
2. it introduces `initial state` problem: e.g. when we add new node into cluster it contains no data. It would accept changes from other nodes, but to have correct value, it should be populated with initial values for other nodes. And this requires additional implementaion efforts.
Due to this considerations and desing goals (simplicity) the choice is `State-bases`. In heavy-loaded environment, this choice may be changed.

## Design considerations

### Communication layer
To implement CRDT counter it's required to provide a way to communicate between all nodes in cluster.
This requires "full-mesh" connectivity.
Possible implementations
1. Message bus (Rabbitmq, Kafka). 
Pro's:
    single point to connect. Easy to change cluster size: node doesn't need to know ip addreses of other nodes. Only broker IP is required.
Cons's: 
    need to install and maintan one more service.
    single point of failure (possible to elimite: most of event brokers may be clusterized)
2. Full mesh
Cons's:
    Every node need to know about all other nodes. Though possible to implement though some kind of service discovery (etcd/consul/zookeeper or implemented inside of application). 
3. Multicast's
Pro's:
    Single point to connect. Easy to change cluster size: node does not need to know ip addresses of other nodes. Only multicast group ip address is required.
Cons's:
    Networking issues: may require efforts on networking level: installation should provide multicast delivery  to all nodes (IGMP handling should be enabled everywhere, problems with NAT's VPN's)
    UDP only: we are not able to use TCP's order and delivery guarantess for multicast.
    Docker does not support mulicasts: problems with orchestrations systems like Kubernetes or simply running several instances in docker locally for debugging purposes
    Not possible to run several instances of process locally for debugging purposes (all of them listens on same mulicast ip address and on same port, that is forbidden)

### Cluster Lifecycle.
Cluster lifecycle consists from
1. periods of normal work (stable set of nodes exchanges messages)
2. Nodes addition (for instance, need to increase cluster performance)
3. Nodes removals with several sub-cases 
3.1 Intentional node removal (e.g. for maintenance)
3.2 Due to hardware error: machine/service on it really stop to work  (e.g. no space left on hdd or machine was broken)
3.3 Split brain: machines really working, but are not able to communicate (e.g. some networking issues)
4. Node restart

Let's analyze all this cases
#### Normal work period
Nothing interesting. It just works

#### Nodes addition.
Node addition process should be handled on two levels: Algorithmic and OPS
1. Algorithmic: Everything is quite easy. Node just appears in cluster, begin to send it's updates to other nodes and begins to accept updates from other machines. Sooner or later new machine will get data from all other machines and begin to return "true" or "near true" value for queries, but this does not block us from "write operations". 
Generally, in production installation, it would be good to address issue of "starting" node: e.g. make it usable to "read" queries only when it will be synchronized with other nodes.
2. OPS: Depending on used communication layer implementation (see above) it may be required to reconfigure other nodes in cluster to know about new node
Additional requirement: Every node should have unique identifier, otherwise system won't be able to work correctly. This may be enforced by some registry (e.g. etcd/zookeeper) or we may use some algorithm to generate identifiers that guarantees uniqueness or probability of collision is very small (e.g. (UUID)[https://en.wikipedia.org/wiki/Universally_unique_identifier])

#### Node removal
When node is removed we want to guarantee correctness of whole system and not to loose data from node that will be removed. 

Let's begin with simplest possible solution and then improve it
Solution: Just shut down node, and do not do any changes in other nodes data.
Pro's: 
    the most easiest solution
Cons's:
    It is not correct. System is not eventutally consistent. Reason: Other node may have different counter value associated with removed node. And due to node is removed, nobody will ever synchronize them (though it's possible to solve this, if every machine will broadcast whole it's data to other nodes)
    Our cluster will remember this machine forever, along with it's data: Excessive memory usage, though it may be not a problem for small clusters, when machines does not goes added/removed frequently

Better solution:
All nodes periodically sends snapshot of all theirs data (including counters associated to other nodes).
On receive node apply "merge" procedure for every node's data (in our case "merge" means  get max of values) to received data and to it's own data.
When node is removed, after it's data will be stabilized, some other node may increment it's data on value of removed node, and then notify all other nodes to just forget about removed node's counter.

Let's look how described algorithm will handle 
##### Manual node removal: 
Ops team decided to remove node (e.g. for maintenance)
1. OPS team make node not to accept new traffic (remove it from balancer, close by firewall, or notify node to stop accepting new counter change request, typically send signal (e.g. nginx uses SIGQUIT)
2. wait some time until node being removed distributes it's final value to other nodes
3. Just shutdown node.
After some time value will be redistributed to other nodes and they will be able to answer correctly to read queries (and that is what `eventual consistency`means).
##### Unrecoverable node crash
Node just crashed. Nothing can be done.
1. One of other nodes will have least outdated value. During some time it will be distributed to other nodes, and they will be able to answer properly to read queries.
2. There is risk that node crashed before it was able to send last updated. But nothing possible to do with this (Actually possible, but this requires to implement smth like write ahead log in ACID databases to provide reliability). Algorithm provides us best possible result.
##### Split brain
Due to network error parts of cluster have no connectivity
In this case cluster "breaks" into subclusters. Subcluster will contain outdated valued from other subcluster but will work and accept updates. But read queries won't be aware about changes in other subcluster.
After network issue will be solved and parts of cluster will be able to communicate, "merge" operation on counter will update data and cluster as a whole become consistent.

#### Node restart
Node restart is sequential node removal + node addition. Both procedures was described above and proven to be correct.

### Persistency layer
Generally, if cluster is large enough, it's possible even not to use persistency layer. Anyway node's data exists at other nodes and can be restored out from there during `merge` operation. This is quite risky solution, but probably usable sometimes when performance is more important then correctness/durability.
Otheriwize some additional persistent storage is required. Depending on our requirements  (performance/relability) we may use different strategies for processing update's
1. respond to sender only when data is really persisted. 
2. respond just after message was recived, and persist data later.


### Frontend part
Frontend view of counter may be considered as one more passive (does not accept write queries) node in CRDT cluster nodes.
To deliver updated to frontend websockets may be used (or any alternative technology. e.g. (server-side-events)[https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events]).
Frontend connects to any node in cluster (there will be balancer in front of cluster so any node may handle this query). CRDT counter code at frontend will guarantee that event if we got outdated message
from outdated machine, nohing bad will happen.
So requirement: CRDT-counter code should work at both frontend/backend. 
Another issue to consider: after page reload, page may be loaded from "outdated" node (e.g. balancer in front of nodes may send query to any node it likes). So to make sure that counter won't go down better to have some persistency on frontend (e.g. local storage)
and consider all received from backend (e.g. page reload, websocket messages) takin into account "current value" and applying those changes with `merge` operation

FIXME it seeems to be quite inconvenient to debug and play with local stroage usage. need to decide what to do

### Run && Build
docker build -t counter:latest .
docker run -it -p 1234:1234 counter:latest

cd balancer
docker build -t balancer:latest .
docker run -it -p 80:1234 balancer:latest





















