## CRDT-counter based video hosting visits counter
TODO: Need to implement simple example implementation of whole projects.
Design goals: it should be simple enough, but show basic features how CRDT counter works.

Generally it's possible to implement CRDT counter in two ways: as
`Operation-based: commutative replicated data types, CmRDTs` or 
`State-based: convergent replicated data types, CvRDTs`
(see [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type))

Operation-based looks better in terms of performance, but it is more complex
1. it requires order and delivery guarantees from communication layer
2. it introduces `initial state` problem: e.g. when we add new node into cluster it contains no data. It would accept changes from other nodes, but to have correct value, it should be populated with initial values for other nodes. And this requires additional implementaion efforts.

Due to this considerations and desing goals (simplicity) the choice is `State-bases`. In heavy-loaded environment, this choice may be changed.

No tests is implemented at all. It's assumed that this contradicts design goals (small and simple and fast to implement)

## Design considerations

### Communication layer
To implement CRDT counter it's required to provide a way to communicate between all nodes in cluster.
This requires "full-mesh" connectivity.
Possible implementations

#### Message bus (RabbitMQ, Kafka). 
Use some already implemented message broker.

Pro's:
* single point to connect. Easy to change cluster size: node doesn't need to know ip addresses of other nodes. Only broker IP is required.
* small efforts to implement

Cons's: 
* need to install and maintain one more service.
* single point of failure and may be bottleneck in really high loaded installations (possible to eliminate: most of event brokers may be clusterised)
    
#### Full mesh
Implement own full-mesh communication software. Depending on implementation this may use anything from simple messages over TCP to some standard protocol like GRPC or something else.

Pro's:
* With proper implementation may be fast and outperform all other solutions
* Depending on implementation may nor require any external services as dependencies
* It may be highly optimized for current application needs

Cons's:
* Every node need to know about all other nodes. Though its possible to implement through some kind of service discovery (etcd/consul/zookeeper or implemented inside of application), but significant efforts is required. 

#### Multicast's
Use [Multicast](https://en.wikipedia.org/wiki/Multicast) traffic to broadcast messages to all nodes. (example: OSPF routing protocol). 

Pro's:
* Single point to connect. Easy to change cluster size: node does not need to know ip addresses of other nodes. Only multicast group ip address is required.

Cons's:
* Networking issues: may require efforts on networking level: installation should provide multicast traffic delivery to all nodes (IGMP handling should be enabled everywhere, problems with NAT's VPN's)
* UDP only: we are not able to use TCP's order and delivery guarantess for multicast.
* Docker does not support mulicasts: problems with orchestrations systems like Kubernetes or simply running several instances in docker locally for debugging purposes
* Not possible to run several instances of process locally for debugging purposes (all of them listens on same mulicast ip address and on same port, that is forbidden)

#### Decision
At first draft of `Multicast's` solution was implemented (try to avoid external services as dependencies). But faced with all described issue, have no choice but to use some other option.

Second choice is use message broker:
This gives possibility to avoid building own communication layer, but fulfills design goals (simplicity, but CRDT counter implemented) requirements. 
For current project RabbitMQ was chosen. Reason: just because I have experience with it, and it's known to fulfill requirements.

In real super-high load installation it may be bottleneck and should be replaced with something other.

### Cluster Lifecycle.
Cluster lifecycle consists from
1. periods of normal work (stable set of nodes exchanges messages)
2. Nodes addition (for instance, need to increase cluster performance)
3. Nodes removals with several sub-cases 
    1. Intentional node removal (e.g. for maintenance)
    2. Due to hardware error: machine/service on it really stop to work  (e.g. no space left on hdd or machine was broken)
    3. Split brain: machines really working, but are not able to communicate (e.g. some networking issues)
4. Node restart

Let's analyze all this cases
#### Normal work period
Nothing interesting. It just works

#### Nodes addition.
Node addition process should be handled on two levels: Algorithmic and OPS
1. Algorithmic: Everything is quite easy. Node just appears in cluster, begin to send it's updates to other nodes and begins to accept updates from other machines. Sooner or later new machine will get data from all other machines and begin to return "true" or "near true" value for queries, but this does not block us from "write operations".
2. OPS: Depending on used communication layer implementation (see above) it may be required to reconfigure other nodes in 
cluster to know about new node

**Notice**: Generally, in production installation, it would be good to address issue of "starting" node: e.g. make it usable to "read" queries only when it will be synchronized with other nodes.

**Additional requirement**: Every node should have unique identifier, otherwise system won't be able to work correctly. This may be enforced by some registry (e.g. etcd/zookeeper) or we may use some algorithm to generate identifiers that guarantees uniqueness or probability of collision is very small (e.g. [UUID/GUID]([https://en.wikipedia.org/wiki/Universally_unique_identifier]))

**Decision**: according to design goals there is no sense in overengineering. So requirement is guaranteed manually. It's required to start all instances with unique values in `NAME` environment variable.
It's possible to implement this using some kind of database (e.g. etcd/zookeeper), but to complicated for test implementation. 

#### Node removal
When node is removed we want to guarantee correctness of whole system and not to loose data from node that will be removed. 

Let's begin with simplest possible solution and then improve it

**Solution**: Just shut down node, and do not do any changes in other nodes data.

Pro's: 
* the most easiest solution

Cons's:
* It is not correct. System is not eventually consistent. Reason: different nodes may have different counter value associated with removed node. And due to node is removed, nobody will ever synchronize them 
* Our cluster will remember this machine forever, along with it's data: Excessive memory usage, though it may be not a problem for small clusters, when machines does not goes added/removed frequently

**Better solution**:
All nodes periodically sends snapshot of all theirs data (including counters associated to other nodes).
On receive node apply "merge" procedure for every node's data (in our case "merge" means  get max of values) to received data and to it's own data. This addresses consistency problem. This also addresses issue when on fail node loose all it's data.

**Additional improvement**: in previous solution node's data says in cluster forever. It's possible to apply one more trick:
After node's removal, one of nodes may increment it's own counter to value of removed node, and then removed node should be forgotten by all nodes alive.

Cons's:
* Increment and forget operation should be "atomic" throughout whole cluster, and this is quite hard to implement.

Let's look how described algorithm will handle different node removal cases. 

##### Manual node removal: 
Ops team decided to remove node (e.g. for maintenance)
1. OPS team make node not to accept new traffic (remove it from balancer, close by firewall, or notify node to stop accepting new counter change request, typically send signal (e.g. nginx uses SIGQUIT)
2. wait some time until node being removed distributes it's final value to other nodes
3. Just shutdown node.
After some time value will be redistributed to other nodes and they will be able to answer correctly to read queries (and that is what `eventual consistency`means).
##### Unrecoverable node crash
Node just crashed. Nothing can be done.
1. One of other nodes will have least outdated value. During some time it will be distributed to other nodes, and they will be able to answer properly to read queries.
2. There is risk that node crashed before it was able to send last updated. But nothing possible to do with this (Actually possible, but this requires to implement something like write ahead log in ACID databases to provide reliability). Algorithm provides us best possible result.
##### Split brain
Due to network error parts of cluster have no connectivity

In this case cluster "breaks" into subclusters. Subcluster will contain outdated valued from other subcluster but will work and accept updates. Read queries will return stale data from another subcluster

After network issue will be solved and parts of cluster will be able to communicate, "merge" operation on counter will update data and cluster as a whole become consistent. In any case total numbers quried from any node, at any time, will only grow up durin whole `split brain` scenario.

##### Decision
Implemented algorithm described above except of merge data from removed node into other node. 

#### Node restart
Node restart is sequential node removal + node addition. Both procedures was described above and proven to be correct.

### Persistency layer
Generally, if cluster is large enough, it's possible even not to use persistency layer. Anyway node's data exists at other nodes and can be restored out from there during `merge` operation. This is quite risky solution, but probably usable when performance is more important then correctness/durability.

But in typical case persistent storage is required. Depending on our requirements (performance/reliability) we may use different strategies for processing update's 
1. respond to sender only when data is really persisted. 
2. respond just after message was received, and persist data later.

**Decision**: For current project it was chosen: does not bother with ACID properties. As storage engine Redis was chosen: lightweight, simple and fast.


### Frontend part
Frontend may be considered as one more passive (does not accept write queries) node in cluster with additional UI.
To deliver updated to frontend websockets may be used (or any alternative technology. e.g. [server-side-events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)).

Frontend connects to any node in cluster (probably at production installation there would be traffic balancer in front of cluster so any node may handle this query).

In case if frontend will be just one more CRDT node, then CRDT counter code will provide non-decreasing behaviour at UI in any case, just due to how `merge` operation is implemented for CRDT grow-only counter. 

**Requirement**: CRDT-counter code should work at both frontend/backend.

Another issue to consider: after page reload, page may be loaded from "outdated" node (e.g. balancer in front of nodes may send query to any node it likes).
So to make sure that counter won't go down after page reload it's better to have some persistency on frontend (e.g. [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)). All updates from backends should be applied to persistent storage value with `merge` operation.

**Notice**: It happens that it is really inconvenient to debug and demonstrate whole system with this feature enabled. So it was removed from implementation. Though it may have sence in production installation.

**Implementation decisions**: Frontend is considered as `passive` cluster node. So code was written in way, that allows code reuse both on frontend and backend.
**Notice**: Frontend may become "active" node. Example: video viewer is implemented as single-page-application, and in this case increments should be processed on client side and sent to backend part of cluster. Due to universal code used both for frontend and backend it's easy to implement this feature. 


## Run && Build
Whole complex consists from several parts:
1. nginx-based http `balancer` in front of `video&counter` services
2. Set of `video&counter` services
3. `rabbitmq` server to provide communication layer between instances.
4. `redis` server to provide persistency layer for `video&counter` services

### Docker-Compose
It may be started with docker-compose. In this case 3 instances of `video&counter` services, Nginx-based `balancer`, `rabbitmq` server and `redis` servers are started.

All services are accessible on `localhost` or `127.0.0.1` at ports described below:
1. `video&counter` services are accessible directly at `1231`, `1232` and `1233` ports (first, second and third nodes respectively)
2. `video&counter` services are accessible through balancer at `1234` port (balancer forwards traffic to arbitrary instance of `video&counter` service according to it's own implementation)

3.`Rabbitmq` admin page is accessible on `15673` port for debugging purposes (non-standard port, to avoid collision with possible RabbitMQ already running at machine)

4. `Redis` is accessible at 6378 port for debugging purposes (non-standard, to avoid collision with Redis, if started locally)

#### Start whole application
```sh 
docker-compose build
docker-compose up
```
Typically whose system start may consume up to 15-20 seconds.

#### Stop whole application
`CTRL+C` to stop.
and to clean-out 

```sh
docker-compose down
```
**Notice**: persistent storage and rabbitmq queues are cleand only after `docker-compose down`. CTRL+C does not change nothing. So to restart from stracth: `docker-compose down && docker-compose up`

#### Starts/stops `video&counter` service
It's possible to start/stop `video&counter` service containers with docker (to see whole system  handle this).

**Example**:
List containers running in docker
```sh
docker ps
```
```
CONTAINER ID        IMAGE                            COMMAND                  CREATED             STATUS              PORTS                                                                     NAMES
18941bfcdcba        test_balancer                    "nginx -g 'daemon of…"   8 seconds ago       Up 6 seconds        80/tcp, 0.0.0.0:1234->8000/tcp                                            test_balancer_1
cca5ea073da9        test_counter3                    "docker-entrypoint.s…"   13 seconds ago      Up 8 seconds        0.0.0.0:1233->1234/tcp                                                    test_counter3_1
4d6b7941951c        test_counter2                    "docker-entrypoint.s…"   13 seconds ago      Up 9 seconds        0.0.0.0:1232->1234/tcp                                                    test_counter2_1
14df47abf16b        test_counter1                    "docker-entrypoint.s…"   13 seconds ago      Up 10 seconds       0.0.0.0:1231->1234/tcp                                                    test_counter1_1
eaba83000a33        rabbitmq:3.7-management-alpine   "docker-entrypoint.s…"   27 minutes ago      Up 12 seconds       4369/tcp, 5671-5672/tcp, 15671/tcp, 25672/tcp, 0.0.0.0:15673->15672/tcp   test_rabbitmq_1
```

Find one or more containers with image named test_counterXXX, take it's container id, and use `docker stop` or `docker start` commands

**Example**: let's stop third `video&counter` service. According table it's id is `cca5ea073da9`. So:

stop:
```sh
docker stop cca5ea073da9
```

start it again:
```sh
docker start cca5ea073da9
```

**Notice**: When container is stopped, balancer will require some time to understand and forward request to other containers. After container is started after downtime, it also may take some time for balancer to find that container is up and running again

### Docker and local start
services may be build with docker one-by-one
#### `video&counter`
```sh
cd services/counter
docker build -t counter:latest .
docker run -it -p 1234:1234 counter:latest
```
**Notice**: `video&counter` service requires rabbitmq url and redis url to known where to connect (environment variables AMQP_URI and REDIS_URI).
Servce may be started locally with 
```sh
cd services/counter
DEV_MODE="true" AMQP_URI=amqp://localhost:5672/ REDIS_URI=redis://localhost:6379 npm start
```
But don't forget to set proper `AMQP_URI` and `REDIS_URI`

#### `balancer`
```sh
cd balancer
docker build -t balancer:latest .
docker run -it -p 80:1234 balancer:latest
```
**Notice**: balancer is configured specially for docker-compose based run. For other installation edit `upstream` section
in nginx configuration (services/balancer/nginx.conf)





















