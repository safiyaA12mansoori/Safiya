from django import forms


class StyledFormMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput):
                css = "form-check-input"
            elif isinstance(widget, (forms.Select, forms.SelectMultiple)):
                css = "form-select"
            elif isinstance(widget, forms.RadioSelect):
                css = ""
            else:
                css = "form-control"
            if css:
                widget.attrs["class"] = (widget.attrs.get("class", "") + " " + css).strip()


class StyledModelForm(StyledFormMixin, forms.ModelForm):
    pass
