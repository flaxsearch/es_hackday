var currentLocation, total = 0, map, marker, circle;
function setLocationLabel(lat, lon) {
    $('#current-location').html('You\'re at ' + lat.toFixed(4) + ', ' + lon.toFixed(4));
}
function setLocationBySensor(query) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            setLocationLabel(position.coords.latitude, position.coords.longitude);
            addLocationFilter(query, position.coords.latitude, position.coords.longitude);
            console.log(query);
            showMap(position.coords.latitude, position.coords.longitude);
            geocodeGps(position.coords.latitude, position.coords.longitude);
            getResults(query, displayResults);
        });
    } else {
        alert('can\'t geolocate');
    }
}


function addLocationFilter(query, lat, lon) {
    query.query.filtered.filter = {
        "geo_distance": {
            "distance": "1km",
            "location": {
                "lat": lat,
                "lon": lon
            }
        }
    };
}


function setLocationByGoogleMaps(latlng)
{
	var query = buildQuery();
    setLocationLabel(latlng.lat(), latlng.lng());
	addLocationFilter(query, latlng.lat(), latlng.lng());
	console.log(query);
	getResults(query, displayResults);
	geocodeGps(latlng.lat(), latlng.lng());
}

$(document).ready(function () {
    total = 1380876; // FIXME
    query = buildQuery();
    setLocationBySensor(query);
    $('#address-lookup').submit(function () {
        geocodeAddress($('#address-input').val(), function (data) {
            var loc = data.results[0].geometry.location;
            var location = new google.maps.LatLng(loc.lat, loc.lng);
            setLocationByGoogleMaps(location);
            placeMarker(location, map, marker);
            map.panTo(location);
        });
        return false;
    });
});


function buildQuery() {
    var date = new Date();
    var year = date.getFullYear()-1;
    var month = date.getUTCMonth()+1;
    var day = date.getDate();
    query = {
        "query" : {
            "filtered" : {
                "query": {
                    "range": {
                        "date": {
                            "gte": year + "-" + (month < 10 ? "0" : "") + month
                        }
                    }
                }
            }
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
	return query;
}


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
	$('#significant-crimes').html('');
    $('#container').html('<div><ul id="results"></ul></div>');
    var localTotal = data.aggregations.significantCrimeTypes.doc_count;
    $.each(data.aggregations.significantCrimeTypes.buckets, function (index, item) {
        var localRate = (item.doc_count / localTotal);
        var globalRate = (item.bg_count / total);
        console.log('doc_count', 'local', 'bg_count', 'total', 'rates...');
        console.log(item.doc_count, localTotal, item.bg_count, total, Math.round(localRate*100), Math.round(globalRate*100));
        var css_class = (( localRate > globalRate) ? 'label label-danger' : 'label label-success');
        $('#significant-crimes').append('<li>' + item.key + ': <span class="' + css_class + '">' + Math.round(localRate/globalRate*100) + '%</span></li>');
    });
}

function geocodeGps(lat, lon) {
    $.ajax(
    'http://maps.googleapis.com/maps/api/geocode/json?latlng='+ lat+','+lon+'',
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


    map = new google.maps.Map(document.getElementById('map-canvas'),
    mapOptions);

    marker = new google.maps.Marker({
        position: myLatlng,
        map: map,
        title:"You are here!"
    });

    circle = new google.maps.Circle({
        center: myLatlng,
        radius: 1000,
        map: map,
        strokeColor: '#FF0000',
        strokeOpacity: 0.2,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.05
    });


    google.maps.event.addListener(map, 'click', function(event) {
        placeMarker(event.latLng, map, marker);
        map.panTo(event.latLng);
		setLocationByGoogleMaps(event.latLng);
    });
}

function placeMarker(latLng) {
    marker.setPosition(latLng);
    circle.setCenter(latLng);
}

function geocodeAddress(address, successCb) {
    $.ajax(
    'http://maps.googleapis.com/maps/api/geocode/json?address='+ address,
    {
        success: successCb
    });
}
