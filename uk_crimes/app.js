$(document).ready(function(){
    //$('#search').submit(function () {
        //var query = $(this).find('#q').val();
    var query = {
        "query" : {
            "match_all" : {}
        },
        "aggregations" : {
            "force" : {
                "terms" : {
                    "field" : "force"
                }
            }
        }
    };
        $.ajax(
        'http://84.40.61.82:9200/ukcrimes/_search',
        {
            //contentType: 'application/json',
            data: JSON.stringify(query),
            dataType : 'json',
            type: 'post',
            crossDomain: true,

    //
            // method: 'post',
            success: function (data) {
                console.log(data);
                $('#container').html('<div><ul id="results"></ul></div>');
                $.each(data.aggregations.force, function(index, item) {
                    $('#results').append('<li>' + item.key + ': ' + item.doc_count + '</li>');
                });
            }
        }
        );
      //  return false;
    //});

});
