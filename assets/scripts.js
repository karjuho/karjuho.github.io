function scrollSpy() {
    var sections = ['work', 'about', 'contact'];
    var current;

    
    
    for (var i = 0; i < sections.length; i++) {
        const middleOfScreen = $(window).scrollTop() + ($(window).innerHeight() / 2);
        
        if ( $('#'+sections[i]).offset().top <= middleOfScreen ) {
            current = sections[i];
        }
    }

    $(".nav a[href='#"+current+"']").addClass('active');
    $(".nav a").not("a[href='#"+current+"']").removeClass('active');      
}


$(document).ready(function() {

    scrollSpy();
    

    // Mail hack
    $('.mail').each(function() {
        var email = $(this).text().replace('(at)', '@');
        $(this).html('<a href="mailto:' + email + '">' + email + '</a>');
    });


  // Smooth scroll
  $('a.scroll').click(function(){
      $('html, body').animate({
          scrollTop: $( $.attr(this, 'href') ).offset().top
      }, 500);
      return false;
  });

  $("#nav").sticky({topSpacing:0});


  $(window).scroll( function(event) {
      scrollSpy();
  });

});
