The issue occurs when trying to deploy a simple cluster with an instance of Kafka and its associated Zookeeper helper to EKS using cdk, kubectl 1.24 and no customized networking, in the eu-west-1 region. This cluster has deployed correctly recently, but I had to pull it down because the instance type I initially specified was too small for the number of pods, and now each deployment attempt fails with the same error:

```Stack Deployments Failed: Error: The stack named cluster-stack failed to deploy: CREATE_FAILED (The following resource(s) failed to create: [pubsubclustermanifestzookeepersvc4A739AD8]. ): Received response status [FAILED] from custom resource. Message returned: StateNotFoundError: State functionActiveV2 not found. at constructor.loadWaiterConfig (/var/runtime/node_modules/aws-sdk/lib/resource_waiter.js:196:32) at new constructor (/var/runtime/node_modules/aws-sdk/lib/resource_waiter.js:64:10) at features.constructor.waitFor (/var/runtime/node_modules/aws-sdk/lib/service.js:271:18)  at Object.defaultInvokeFunction [as invokeFunction] (/var/task/outbound.js:1:826)  at processTicksAndRejections (internal/process/task_queues.js:95:5)  at async invokeUserFunction (/var/task/framework.js:1:2149)  at async onEvent (/var/task/framework.js:1:365)  at async Runtime.handler (/var/task/cfn-response.js:1:1543) (RequestId: fb6f2409-3698-4743-bdce-07c31e17ccdb)```

The exact resource that it fails at (here “pubsubclustermanifestzookeepersvc4A739AD8”) differs between attempts, and can be both the services, the AWS auth object, and the pods. 

Note that the "YourRoleNameHere" on line 174 of ```cdktest-stack``` needs to be filled out with the name of the role you’re using. 
