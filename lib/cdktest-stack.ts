import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AwsAuth, Cluster, KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { KubectlV24Layer } from '@aws-cdk/lambda-layer-kubectl-v24';
import { AccountRootPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';

export class CdktestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const clusterAdmin = new Role(this, "admin-role", {
      assumedBy: new AccountRootPrincipal()
    })
    
    const kubectl = new KubectlV24Layer(this, "kubectl-layer")
    const cluster = new Cluster(this, 'pubsub-cluster', {
      clusterName: "pubsub-cluster",
      mastersRole: clusterAdmin,
      version: KubernetesVersion.V1_24,
      kubectlLayer: kubectl,
      defaultCapacity: 1,
      defaultCapacityInstance: InstanceType.of(InstanceClass.T2, InstanceSize.SMALL)
    });

    cluster.addManifest('zookeeper-svc', {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'zookeeper-svc'
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: 'zookeeper-app'
        },
        ports: [{
          targetPort: 'zookeeper-port',
          port: 2181
        }]
      }
    })

    cluster.addManifest('broker-svc', {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'broker-svc'
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: 'broker-app'
        },
        ports: [{
          targetPort: 'broker-port',
          port: 9092
        }]
      }
    })

    cluster.addManifest('zookeeper-app', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'zookeeper-app'
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'zookeeper-app'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'zookeeper-app'
            }
          },
          spec: {
            containers: [{
              image: 'confluentinc/cp-zookeeper:7.3.0',
              imagePullPolicy: "IfNotPresent",
              name: 'zookeeper-app',
              ports: [{
                containerPort: 2181,
                name: 'zookeeper-port'
              }],
              env: [
                  {
                name: "ZOOKEEPER_CLIENT_PORT",
                value: "2181"
                },
                {
                  name: "ZOOKEEPER_TICK_TIME",
                  value: "2000"
                }]
            }]
          }
        }
      }
    });
    
    cluster.addManifest('broker-app', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'broker-app'
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'broker-app'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'broker-app'
            }
          },
          spec: {
            hostname: 'broker-svc',
            containers: [{
              image: 'confluentinc/cp-kafka:7.3.0',
              imagePullPolicy: "IfNotPresent",
              name: 'broker-app',
              ports: [{
                containerPort: 9092,
                name: 'broker-port'
              }],
              env: [{
                  name:"KAFKA_BROKER_ID",
                  value: "1"
                }, 
                {
                  name: "KAFKA_ZOOKEEPER_CONNECT", 
                  value:'zookeeper-svc:2181'
                },
                {
                  name: "KAFKA_LISTENERS",
                  value: 'PLAINTEXT://:9092'
                },
                {
                  name: 'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP',
                  value:'PLAINTEXT:PLAINTEXT'
                },
                {
                  name: 'KAFKA_ADVERTISED_LISTENERS',
                  value: 'PLAINTEXT://broker-svc:9092'
                },
                {
                  name: 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR',
                  value: "1"
                },
                {
                  name: 'KAFKA_TRANSACTION_STATE_LOG_MIN_ISR',
                  value: "1"
                },
                {
                  name: 'KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR',
                  value: "1"
                },
              ]
            }]
          }
        }
      }
    })


    const ssoRole = Role.fromRoleName(this, "admin-sso-role", '<YourRoleNameHere>');

    const awsAuth = new AwsAuth(this, "aws-auth", {
      cluster: cluster
    })

    awsAuth.addMastersRole(ssoRole)
  }
}

