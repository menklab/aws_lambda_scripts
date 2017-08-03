'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');

var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

exports.handler = (event, context, callback) => {
    // get volumes
   ec2.describeVolumes({
        Filters: [
           {
               Name: "tag-key",
               Values: ["snapshot_rotation"]
           }
        ]
   }, function(err, volData) {
        if (!!err) {
           callback("error getting volumes to snapshot: " + JSON.stringify(err, null, 2), null);
           return;
        }
        var volumes = volData.Volumes;
        var volumesForSnapshotRotate = {};
        var volumeIdsForSnapshotRotate = [];
          // create snapshots for each volume
        for (var i=0; i < volumes.length; i++) {
            var vol = volumes[i];
            volumeIdsForSnapshotRotate.push(vol.VolumeId);
            console.log("Starting backup on: " + vol.VolumeId);
            var params = {
                VolumeId: vol.VolumeId,
                Description: "Backup snapshot created by lambda script"
            }
            ec2.createSnapshot(params, function(err, data) {
                if (!!err) {
                    console.log("Error creating snapshot: " + JSON.stringify(err, null, 2));
                }
                else {
                    console.log("Created snapshot: " + JSON.stringify(data, null, 2));
                }
            });
            
            // loop through volume tags to check rotation period
            for (var j=0; j<vol.Tags.length; j++) {
                var tag = vol.Tags[j];
                if (tag.Key === "snapshot_rotation") {
                    volumesForSnapshotRotate[vol.VolumeId] = tag.Value;
                }
            }
        }
        
        console.log("volumes For Rotation: " + JSON.stringify(volumesForSnapshotRotate, null ,2))
        console.log("volumeIds For Rotation: " + JSON.stringify(volumeIdsForSnapshotRotate, null ,2))
        
        // configure snapshot params
        var snapshotParams = {
            Filters: [
                {
                    Name: "volume-id",
                    Values: volumeIdsForSnapshotRotate
                },
                {
                    Name: "status",
                    Values: ["completed", "error"]
                }
            ]
        };
        // do snapshot rotation
        ec2.describeSnapshots(snapshotParams, function(err, snapshots) {
            if (!!err) {
                callback("Error getting snapshot information: " + JSON.stringify(err, null,2), null);
                return;
            }
            
            // loop through snapshots and see if they need to be deleted
            for (var k=0; k < snapshots.Snapshots.length; k++) {
                var snapshot = snapshots.Snapshots[k];
                var deleteOlderThan = new Date();
                deleteOlderThan.setDate(deleteOlderThan.getDate() - volumesForSnapshotRotate[snapshot.VolumeId]);
                
                // check delete time and delete if to old
                if (snapshot.StartTime < deleteOlderThan) {
                    ec2.deleteSnapshot({SnapshotId: snapshot.SnapshotId}, function(err, data) {
                        if (!!err) {
                            console.log("error deleting snapshot: " + JSON.stringify(err, null, 2));
                        }
                        else {
                            console.log("Snapshot deleted: " + JSON.stringify(data, null, 2));
                        }
                    });
                }
            }
        });
   });
}; 
