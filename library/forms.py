from django import forms

from core.forms import StyledModelForm

from .models import BookCategory, LibraryBook


class CategoryForm(StyledModelForm):
    class Meta:
        model = BookCategory
        fields = ["name"]


class BookForm(StyledModelForm):
    class Meta:
        model = LibraryBook
        fields = ["title", "author", "isbn", "category", "publisher", "total_copies", "available"]


class IssueForm(forms.Form):
    book = forms.ModelChoiceField(queryset=LibraryBook.objects.filter(available__gt=0), widget=forms.Select(attrs={"class": "form-select"}))
    student = forms.ModelChoiceField(queryset=None, widget=forms.Select(attrs={"class": "form-select"}))
    due_on = forms.DateField(widget=forms.DateInput(attrs={"type": "date", "class": "form-control"}))

    def __init__(self, *args, **kwargs):
        from students.models import StudentProfile

        super().__init__(*args, **kwargs)
        self.fields["student"].queryset = StudentProfile.objects.filter(user__is_active=True).select_related("user")
