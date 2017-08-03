'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

var params = {};
var done;
var awsRe = new RegExp("^aws:.*");
var ebsRe = new RegExp("^elasticbeanstalk:.*");

exports.handler = function (event, context, callback) {
    done = callback;

    // get map of all volumes[] -> attachments[] -> tags[]
    getVolumesAndTagsMap(function (volTagMap) {

        // for each volume
        var volCount = 0;
        for (var volId in volTagMap) {
            (function (instanceMap, totalVols, volId) {

                // for each instance
                var instanceCount = 0;
                for (var instanceId in instanceMap) {
                    (function (tagAry, totalInstances, instanceId) {

                        // for each tag
                        var tagCount = 0;
                        for (var i = 0; i < tagAry.length; i++) {
                            (function (tag, totalTags) {

                                // tag volume
                                tagVolume(volId, instanceId, tag.Key, tag.Value, function () {

                                    // count of tags so we know when we are ready to move on
                                    tagCount++;
                                    console.log(volId + ' -> ' + instanceId + '-> tagCount: ' + tagCount + ' of ' + totalTags);
                                    if (tagCount == totalTags) {

                                        // add instanceId as tag
                                        tagVolume(volId, instanceId, "instanceId", instanceId, function () {

                                            // count of instances so we know when we are ready to move on
                                            instanceCount++;
                                            console.log(volId + ' ->  instanceCount: ' + instanceCount + ' of ' + totalInstances);

                                            if (instanceCount == totalInstances) {

                                                // count of volumes so we know when we are ready to move on
                                                volCount++;
                                                console.log("volCount: " + volCount + ' of ' + totalVols);

                                                // done
                                                if (volCount == totalVols) {
                                                    done(null, "done");
                                                }
                                            }
                                        });
                                    }
                                });

                            }(tagAry[i], tagAry.length));
                        }
                    })(instanceMap[instanceId], Object.keys(instanceMap).length, instanceId);
                }
            }(volTagMap[volId], Object.keys(volTagMap).length, volId));
        }
    });

};

function getVolumesAndTagsMap(cb) {
    ec2.describeVolumes(params, function (err, vData) {
        if (err) { // err
            console.log(err, err.stack);
            done(err, null);
            return;
        }

        getAllTagsForAllVolumes(vData.Volumes, function (volTagMap) {
            cb(volTagMap);
        });
    });
}

function getAllTagsForAllVolumes(v, cb) {
    var volMap = {};
    var vCount = 0;

    // loop through each volume
    for (var i = 0; i < v.length; i++) {
        (function (vol, totalVols) {

            // set for later so it isn't null
            volMap[vol.VolumeId] = {};

            // loop through each attachment
            for (var j = 0; j < vol.Attachments.length; j++) {
                (function (attachment, totalAttachments) {

                    var aCount = 0;
                    // get tags for instance
                    (function (volId, instId) {

                        // get tags for each volume[]->attachments[]
                        getTagsForInstance(instId, function (tags) {
                            var goodTags = [];
                            for (var l = 0; l < tags.length; l++) {
                                var tag = tags[l];
                                if (!awsRe.test(tag.Key) && !ebsRe.test(tag.Key)) {
                                    goodTags.push(tag);
                                }
                            }
                            volMap[volId][instId] = goodTags;
                            aCount++;
                            // verify all attachment tags have been fetched before adding to volume map
                            if (aCount == totalAttachments) {
                                vCount++;
                                // verify all volumes are complete before returning
                                if (vCount == totalVols) {
                                    cb(volMap);
                                }
                            }
                        });

                    }(vol.VolumeId, attachment.InstanceId));
                })(vol.Attachments[j], vol.Attachments.length);
            }

        })(v[i], v.length);

    }
}

function getTagsForInstance(ec2InstId, cb) {
    // get tags from attachment
    var tagParams = {
        Filters: [
            {
                Name: "resource-id",
                Values: [
                    ec2InstId
                ]
            }
        ]
    };
    ec2.describeTags(tagParams, function (err, data) {
        var tags = [];
        if (err) { // err
            console.log(err, err.stack);
            done(err, null);
            return;
        }
        for (var i = 0; i < data.Tags.length; i++) {
            var tag = data.Tags[i];
            tags.push({Key: tag.Key, Value: tag.Value});
        }

        cb(tags);
    });
}

function tagVolume(volumeId, instanceId, tagKey, tagValue, cb) {
    // params to create tag
    var addTagParam = {
        Resources: [
            volumeId
        ],
        Tags: [
            {
                Key: tagKey,
                Value: tagValue
            }
        ]
    };

    // execute tag creation
    ec2.createTags(addTagParam, function (err, data) {
        if (err) {// an error occurred
            console.log(err, err.stack);
            done(err, null);
        }
        else {// successful response
            console.log("Added: " + volumeId + " -> " + instanceId + " -> ", tagKey + ": " + tagValue);
            cb();
        }
    });
}
