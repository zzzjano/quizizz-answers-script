$(".filter").on("keyup", function() {
  var input = $(this).val().toUpperCase();
if(input.length > 0){
  $(".card").each(function() {
    if ($(this).find(".card-title p").text().toUpperCase().indexOf(input) < 0) {
      $(this).hide();
    } else {
      $(this).show();
    }
  })
}else{
    $(".card").each(function() {
        $(this).show();
});
}
});