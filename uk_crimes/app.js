$(document).ready(function(){
    $.ajax(
        'http://84.40.61.82:9200/ukcrimes/_search?query=car',
    {
        success: function (data) {
            $('body').append(data.hits.total);
        }
    }
    )
});
