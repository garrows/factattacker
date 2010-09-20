#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import os, random
from django.utils import simplejson  
from datetime import datetime, date, time
from google.appengine.ext.webapp import template
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext import db

class Questions(db.Model):
    id = db.IntegerProperty()
    question = db.StringProperty(multiline=False)
    difficulty = db.IntegerProperty()
    answers = db.StringListProperty()

class SimpleQuestion():
    id = 0
    question = ""
    difficulty = 0
    correct = 0
    answers = []    
    def toJSON(self):
      q = self
      return '{"id": "' + str(q.id) + '", "question": "'+q.question+'", "difficulty": "'+str(q.difficulty)+'", "correct": "'+str(q.correct)+'", "answers": ' + simplejson.dumps(q.answers) +' }'
    
class MainHandler(webapp.RequestHandler):
    def get(self):
      template_values = { }

      path = os.path.join(os.path.dirname(__file__), 'index.html')
      self.response.out.write(template.render(path, template_values))

class GetQuestion(webapp.RequestHandler):
    def get(self):
      
      qs = [
         ["What is the capital of England?", ["London", "Sydney", "Brisbane" ]],
		 ["What is the capital of Australia?", ["Canberra", "Sydney", "Brisbane" ]],
         ["What does a hygrometer measure?", ["Humidity", "Earthquakes", "Pressure"]],
		 ["Who lives in a trash can on Sesame Street?", ["Oscar", "Elmo", "Cookie Monster"]],
		 ["What farm animal gives us milk to drink?", ["Cow", "Chicken", "Horse", "Dog"]],
		 ["What animal is pink and has a curly tail?", ["Pig", "Cat", "Horse", "Cow"]],
		 ["What vehicle runs on a track and blows a whistle?", ["Train", "Airplane", "Helicopter", "Car"]],
         ["What color is a lemon?", ["Yellow", "Orange", "Red", "Blue", "Green"]]
      ]
      i = random.randint(0, 7)
      question = SimpleQuestion()
      question.id = 0
      question.question = qs[i][0]
      question.difficulty = random.randint(0, 10)
      question.correct = 0
      question.answers = qs[i][1]
      self.response.out.write(question.toJSON())
      

def main():
    application = webapp.WSGIApplication([
        ('/', MainHandler),
        ('/getQuestion', GetQuestion)
        ],
        debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
