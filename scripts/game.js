var bullets = new Array(); //Holds bullet objects
var answers = new Array(); //Holds answer objects
var maxBullets = 6;        //Max bullets in the air at one time. Subject to powerups.
var answerWidth = '10%';   //Answer width. Subject to powerups.
var answerHeight = '5%';   //Answer height. Subject to powerups.
var answerSpeed = 2500;    //miliseconds from side to side. Also multiplied.
var bulletWidth = '3%';    //Bullet width. Subject to powerups.
var bulletHeight = '5%';   //Bullet height. Subject to powerups.
var bulletSpeed = 1500;    //miliseconds from bottom to top
var gameTickerThread;      //Timeout for game (bullet/answer/question) handler
var gameTickerSpeed = 5;   //miliseconds
var questionRequired = true; //Set to false and a new question is added.
var bulletImage = 'images/egg3.gif';
var lastTouchEvent = "";        //Last touch event called
var left = false;               //True if key is pressed. 
var right = false;              //True if key is pressed. 
var up = false;                 //True if key is pressed. 
var down = false;               //True if key is pressed. 
var keyboardMoveSize = 3;       //Moves x pixels per gameLoop.
var shipSpeed = 5;              //Can update ship every x ms. 
var lastMove = (new Date()).getTime();

//Startup function
$(document).ready(function () {

  /* Setup keyboard event handlers */
  setupKeyEvents();
  
  /* Setup iPhone touch events */
  addTouchEvents();  

  /* Handle resize if window does */
  $(window).resize(function () {
    handleResize();
  });
  
  /* Make ship follow the mouse */
  $(document).mousemove(function (e) {
    moveShipTo(e.pageX);
  });
  
  /*Make the ship fire on click */
  $(document).click(function (e) {
    fireBullet(e);
  });
  
  //Positions the ship for first time
  handleResize();
  //Asks first question
  askQuestion();
  //Starts game handler
  gameTicker();
});

//Called when a new question is to be asked
function askQuestion() {
  //Stop this being called too many times.
  questionRequired = false;
  
  //Get the question from the server
  $.getJSON('/getQuestion', {}, gotQuestionCallback);
  
  //Removes all old answers
  answers.splice(0, answers.length);
    
  //Clears visual feedback from bullet collision
  $("#container").css({"background-color": "transparent" });
}

//Callback when question has been got
function gotQuestionCallback(data) {
	if (data) {
		//Display the question
    $('#question').text(data.question);
    
    //Create all the answers
    var direction = true;
    for (i = 0; i < data.answers.length; i++) {
      answer = new Object();
      answer.unhashedid = 'answer' + i;
      answer.id = '#' + answer.unhashedid;
      answer.answer = data.answers[i];
      direction = !direction;
      answer.direction = direction;
      answer.y = Math.random() * ($(window).height()*.8);
      answer.x = Math.random() * $(window).width();
      //answer.width = answerWidth;
      answer.height = answerHeight;
      answer.speed = (i+1)*answerSpeed; //Miliseconds from between sides
      answer.d = new Date();
      answer.startTime = answer.d.getTime();
      answer.endTime = answer.startTime + answer.speed;
      if (i == data.correct) {answer.correct = true; } else { answer.correct = false; }
      
      //Create the div
      $(document.body).append('<div class="answer" id='+answer.unhashedid+'>' + answer.answer + '</div>');
      
      //Set its style properties
      //$(answer.id).css({"left": answer.x, "top":answer.y, "width":answer.width, "height":answer.height, "font-size":answer.height});    
	  $(answer.id).css({"left": answer.x, "top":answer.y, "height":answer.height, "font-size":answer.height});    
      $(answer.id).css({"font-size":($(answer.id).height() *0.8)}); //With maths, this can me moved to previous line
      //TODO:move this to a more meaningfull place
      $('body').css({"font-size":($(answer.id).height() *0.8)});       
      answer.width = $(answer.id).width();
	  
      //Handles movement
      answer.answerTick = function() {
        this.d = new Date();
        //Calculate percent across screen dependant on time           
        this.perc = (this.d.getTime() - this.startTime) / (this.endTime - this.startTime);
        if (this.direction == '0') { //heading right
           //Convert percent to pixels
           this.x = $(window).width() * (this.perc); 
           
           //Handles turn around
           if (this.x + $(this.id).width() + 5 > $(window).width()) { 
              this.direction = '1'; 
              this.startTime = this.d.getTime();
              this.endTime = this.startTime + this.speed;
           }
        } else { //heading left
           //Convert percent to pixels
           this.x = $(window).width() * (1-this.perc); 
           this.x = this.x - $(this.id).width();
           
           //Handles turn around
           if (this.x <= 0) { 
              this.direction = '0'; 
              this.startTime = this.d.getTime();
              this.endTime = this.startTime + this.speed;
           }
        }
        //Sets the new position
        $(this.id).css({"left": this.x});      
      }
      
      //Adds object to array
      answers.push(answer);
    }  
	}
}

//Called on mouse click
function fireBullet(e) {
  tmp = new Date();
  //Stops extra bullets
  if (bullets.length >= maxBullets) { return false; }
  
  //Creates the new bullet object
  bullet  = new Object();
  
  bullet.id = 'bullet' + Math.floor(Math.random() * 1000000);
  bullet.hashedid = '#' + bullet.id;
  //TODO: Detect unlikely id conflict
  bullet.bulletSpeed = bulletSpeed;
  bullet.d = new Date();
  bullet.startTime = bullet.d.getTime();
  bullet.endTime = bullet.startTime + bullet.bulletSpeed;
  bullet.width = bulletWidth;
  bullet.height = bulletHeight;
  bullet.heightInPx = percentToPixelsY(bulletHeight);
  bullet.x = ($("#ship").position().left + ($("#ship").width() / 2))- (percentToPixelsX(bulletWidth) / 2);
  windowHeight = $(window).height();
  bullet.y = windowHeight - (windowHeight * toPercent(bulletHeight));
  
  //Create div 
  $(document.body).append("<div id='" + bullet.id + "' class='bullet'><img class='bulletimg' src='" +bulletImage+"' alt='bullet' /></div>");
  //Set style properties
  $('#' + bullet.id).css({"left": bullet.x, "top": bullet.y, "width":bullet.width, "height":bullet.height });
  
  //Handles flight. Called by gameTickerThread
  bullet.bulletTick = function () {
     //Calculate percent across screen dependant on time
     this.d = new Date();
     this.perc = (this.d.getTime() - this.startTime) / (this.endTime - this.startTime);
     //Convert percent to pixels
     this.y = $(window).height() * (1-this.perc); 
     
     //Detect edge of screen
     if (this.y <= 0 || this.perc >= 1) {
        //Remove from DOM
        $('#' + this.id).remove(); 
        //false the gameTickerThread to remove this bullet from bullets array.
        return false; 
     } else {
        //Update position
        $(this.hashedid).css({"left": this.x, "top": (this.y - this.heightInPx) });        
        return true;
     }
  }
    
  //Adds new bullet object to array
  bullets.push(bullet);
}

//Like a OnPaint method
function gameTicker() {
   clearTimeout(gameTickerThread);
   
   checkKeyboard();
   
   //Move all bullets
   for (i = 0; i < bullets.length; i++) {
      if (bullets[i].doomed || bullets[i].bulletTick() == false) {
         //removes finished bullet
         bullets.splice(i,1); //TODO: Fix this so it actually removes it
         i--;
      }
   }
   
   //Move all answers
   for (i = 0; i < answers.length; i++) {
      answers[i].answerTick();
   }
   
   //Checks for bullet-answer collisions
   if (bullets.length > 0) { //No use if there are no bullets 
       collision = false;
       wh = $(window).height();
       ww = $(window).width();
       for (ia=0; ia < answers.length; ia++) {
          answer = answers[ia];
          for (ib=0; ib < bullets.length; ib++) {
             bullet = bullets[ib];
             //Detect collision
             t_x = [bullet.x, bullet.x + (ww * toPercent(bullet.width))];
             t_y = [bullet.y, bullet.y + (wh * toPercent(bullet.height))];
             //i_x = [answer.x, answer.x + (ww * toPercent(answer.width))]
			 i_x = [answer.x, answer.x + answer.width]
             i_y = [answer.y, answer.y + (wh * toPercent(answer.height))];
             if ( t_x[0] < i_x[1] && t_x[1] > i_x[0] &&
                t_y[0] < i_y[1] && t_y[1] > i_y[0]) {
                collision = true;
                break;
              }    
          }
          if (collision) { break; }
       }
       if (collision) { 
          //Fade out all answers. Then remove them.
          $('.answer').stop().fadeOut('fast', function () { $(this).remove(); });
          $(bullet.hashedid).remove();
          bullet.doomed = true;
          if (answer.correct) {
             $("#container").css({"background-color": "green" }); //Cleared later
             answerSpeed = answerSpeed - (answerSpeed * 0.05);
          } else {
             $("#container").css({"background-color": "red" }); //Cleared later
             answerSpeed = answerSpeed + (answerSpeed *0.05);
          }
          $("#score").text("Speed: " + answerSpeed.toFixed());
          questionRequired = true;
       }
   }
   
   //Checks if a question is needed (no answers remain in DOM).
   if ($('.answer').length == 0 && questionRequired) {askQuestion();}
   
   //Setup timed loop.
   gameTickerThread = setTimeout("gameTicker()",gameTickerSpeed);
}

//Moves ship to x pixels. 
function moveShipLeft(x) {
  s = $("#ship");
  newx = s.position().left + (s.width() / 2) - x;
  moveShipTo(newx);
}
function moveShipRight(x) {
  s = $("#ship");
  newx = s.position().left + (s.width() / 2) + x;
  moveShipTo(newx);
}
function moveShipTo(x) {
  var dd = new Date();
  var diff = dd.getTime() - lastMove;
  //helps smoothness and keyboard controlls
  if (diff/(shipSpeed) > 1) {
    s = $("#ship");
    x = (x - (s.width() / 2));
    if (x + s.width() >= $(window).width()) {
       x = $(window).width() - s.width();
    } else if (x < 0) {
       x = 0;
    }
    s.css({"left": x + "px" });
    lastMove = dd.getTime();
  }
}

//Called when window resizes
function handleResize() {
  $('#ship').stop().css(
    { "left": ($(window).width() / 2) - ($("#ship").width() / 2),
      "top": $(window).height() - $("#ship").height() 
    }
  );
  answerWidthInPx = percentToPixelsX(answerWidth);
  //TODO: recalculate the font sizes and change all the font styles
}

//Converts '10%' string to a 0.1 double
function toPercent(per) {
  strr = '';
  for (i=0; i < per.length; i++) {
    if (per.charAt(i) == '%') {break;}
    strr = strr + per.charAt(i);
  }
  return (strr / 100);  
}

//Converts percent string to pixels relative to window size. 
function percentToPixelsX(per) {
  dec = toPercent(per);
  return ($(window).width() * dec);
}
function percentToPixelsY(per) {
  dec = toPercent(per);
  return ($(window).height() * dec);
}

//Masks iPhone touch events as mouse events.
function touchHandler(event) {
  //Gets the touch event
  var touches = event.changedTouches,
      first = touches[0],
      type = "";
  switch(event.type)
  {
     case "touchstart": type = "mousedown"; break;
     case "touchmove":  type="mousemove";   break;        
     case "touchend":   
        type="mouseup"; 
        //click event if its a tap. 
        if (lastTouchEvent == "touchstart") {
          type="click";
        }
        break;
     default: return;
  }
  //Used for determining taps
  lastTouchEvent = event.type;
  //Create the mouseEvent and raise it.
  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                first.screenX, first.screenY, 
                                first.clientX, first.clientY, false, 
                                false, false, false, 0/*left*/, null);

  first.target.dispatchEvent(simulatedEvent);
  //Turns off the default event.
  event.preventDefault();
}

//Addes event listeners for iPhone and some other mobile browsers
function addTouchEvents() {
  try { document.addEventListener("touchstart",  touchHandler, true); } catch(err) {  }
  try { document.addEventListener("touchmove",   touchHandler, true); } catch(err) {  }
  try { document.addEventListener("touchend",    touchHandler, true); } catch(err) {  }
  try { document.addEventListener("touchcancel", touchHandler, true); } catch(err) {  }
}

//Checks if action needs to be done from keyboard input.
function checkKeyboard() {
  if (left && !right) { moveShipLeft(keyboardMoveSize);  }
  if (right && !left) { moveShipRight(keyboardMoveSize); }
  if (up) {
    fireBullet(null);
    up = false; //Prevents firing more than one. 
  }
  if (down) {}
}

//Setups event listeners and handlers for the keyboard.
function setupKeyEvents() {
  $(document).keydown(function (e) {
    switch(e.keyCode)
    {
       case 37:  left = true; break;
       case 38: up = true; break;   
       case 39: right = true; break;   
       case 40: down = true; break;        
       default: $("#score2").text(e.keyCode);
    }
  });
  $(document).keyup(function (e) {
    switch(e.keyCode)
    {
       case 37:  left = false; break;
       case 38: up = false; break;   
       case 39: right = false; break;   
       case 40: down = false; break;        
       default: /*$("#score2").text(e.keyCode);*/
    }
  });
}

