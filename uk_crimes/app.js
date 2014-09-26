var currentLocation, total = 0, query = {};
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            $('#current-location').html('You\'re at ' + position.coords.latitude  +', ' + position.coords.longitude);
            query.query.filtered.filter = {
                "geo_distance": {
                    "distance": "1km",
                    "location": {
                        "lat": position.coords.latitude,
                        "lon": position.coords.longitude
                    }
                }
            };
            console.log(query);
            getResults(query, displayResults);
        });
    } else {
        alert('can\'t geolocate');
    }
}

$(document).ready(function () {
    total = 1380876;
    var date = new Date();
    var year = date.getFullYear()-1;
    var month = date.getUTCMonth()+1;
    var day = date.getDate();
    console.log(year, month, day);
    query = {
        "query" : {
            "filtered" : {
                "query": {
                    "range": {
                        "date": {
                            "gte": year + "-0" + month
                        }
                    }
                }
            }
            //"match_all" : {}
        },
        "aggregations": {
            "crimeType": {
                "terms": {
                    "field": "crimeType"
                }
            },
            "significantCrimeTypes": {
                "significant_terms": {
                    "field": "crimeType"
                }
            }
        }
    };
    getLocation();
});


function getResults(query, success) {
    $.ajax(
        'http://84.40.61.82:9200/ukcrimes/_search',
        {
            //contentType: 'application/json',
            data: JSON.stringify(query),
            dataType: 'json',
            type: 'post',
            crossDomain: true,
            success: success
        }
    );
}

function displayResults(data) {
    console.log(data);
    $('#container').html('<div><ul id="results"></ul></div>');
    var localTotal = data.aggregations.significantCrimeTypes.doc_count;
    $.each(data.aggregations.significantCrimeTypes.buckets, function (index, item) {
        var localRate = (item.doc_count / localTotal);
        var globalRate = (item.bg_count / total);
        console.log('doc_count', 'local', 'bg_count', 'total', 'rates...');
        console.log(item.doc_count, localTotal, item.bg_count, total, Math.round(localRate*100), Math.round(globalRate*100));
        var css_class = (( localRate > globalRate) ? 'bigger' : 'smaller');
        $('#significant-crimes').append('<li class="' + css_class + '">' + item.key + ': ' + Math.round(localRate/globalRate*100) + '%</li>');
    });
}
