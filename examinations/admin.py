from django.contrib import admin

from .models import Examination, ExaminationAttempt, ProgrammingProblem, Question, QuestionOption

admin.site.register(Question)
admin.site.register(QuestionOption)
admin.site.register(Examination)
admin.site.register(ExaminationAttempt)
admin.site.register(ProgrammingProblem)
