var currentLocation, total = 0, query = {};
function setLocationBySensor() {
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
            showMap(position.coords.latitude, position.coords.longitude);
            geocodeGps(position);
            getResults(query, displayResults);
        });
    } else {
        alert('can\'t geolocate');
    }
}

function setLocationByGoogleMaps()
{

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
    setLocationBySensor();
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

function geocodeGps(position) {
    $.ajax(
    'http://maps.googleapis.com/maps/api/geocode/json?latlng='+ position.coords.latitude+','+position.coords.longitude+'',
    {
        success: function (data) {
            console.log(data);
            var addressComponents = data.results[0].address_components;
            var address = addressComponents[0].long_name + ' ' + addressComponents[1].long_name + ' ' + addressComponents[2].long_name;
            $('#address').html(address);
        }
    });

}

function showMap(lat, lon) {
    var myLatlng = new google.maps.LatLng(lat, lon);

    var mapOptions = {
        center: myLatlng,
        zoom: 12
    };


    var map = new google.maps.Map(document.getElementById('map-canvas'),
    mapOptions);

    var marker = new google.maps.Marker({
        position: myLatlng,
        map: map,
        title:"You are here!"
    });

    google.maps.event.addListener(map, 'click', function(event) {
        placeMarker(event.latLng, map, marker);
    });
}

function placeMarker(latLng, map, marker) {
    marker.setPosition(latLng)
}
