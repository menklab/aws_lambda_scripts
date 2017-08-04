'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');

// get ec2 handler
var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
var route53 = new AWS.Route53({apiVersion: '2013-04-01'});

exports.handler = (event, context, callback) => {

    var instanceId = event.detail["instance-id"];
    console.log("INSTANCE ID: ", instanceId);
    ec2.describeInstances({
        InstanceIds: [instanceId]
    }, function(err, data) {
        if (!!err) {
            console.log("Error getting instance details: ", err);
            callback(err, "done.");
            return
        }
        
        // loop each reservation
        for (var i=0; i < data.Reservations.length; i++) {
            var instances = data.Reservations[i].Instances;
            
            // loop instances
            for (var j=0; j < instances.length; j++) {
                var inst = instances[j];
                if (inst.InstanceId == instanceId) {
                    // get new dns value
                    var newCnameValue = inst.PublicIpAddress;
                    
                    // get zoneId
                    console.log("tags: ", JSON.stringify(inst, null ,2));
                    var zoneId = "";
                    var cname = "";
                    for (var l=0; l < inst.Tags.length; l++) {
                        var tag = inst.Tags[l];
                        if (tag.Key === "zoneId") {
                            zoneId = tag.Value;
                        }
                        if (tag.Key === "cname") {
                            cname = tag.Value;
                        }
                    }
                    
                    if (zoneId === "" || cname === "") {
                        console.log("zoneId or cname are not defined in ec2 tag.");
                        callback("zoneId or cname are not defined in ec2 tag.", null);
                        return;
                    }
                    
                    // make route53 change
                    var route53Params = {
                        "HostedZoneId": zoneId, // our Id from the first call
                        "ChangeBatch": {
                            "Changes": [
                                {
                                    "Action": "UPSERT",
                                    "ResourceRecordSet": {
                                        "Name": cname,
                                        "Type": "A",
                                        "TTL": 60,
                                        "ResourceRecords": [
                                            {
                                                "Value": newCnameValue
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    };
                    
                    route53.changeResourceRecordSets(route53Params, function(err,data) {
                        if (!!err) {
                            console.log("failed to update zone: ", JSON.stringify(err, null, 2));
                            callback(err, null);
                            return;
                        }
                        console.log("Updated Zone Cname: " + cname + " with new value: " + newCnameValue);
                        callback(null, "done.");
                        return;
                    });
                    
                }
            }
        }
    });
};
