from django import forms


class ClassroomSelect(forms.Select):
    def __init__(self, *args, year_for=None, **kwargs):
        self.year_for = year_for or {}
        super().__init__(*args, **kwargs)

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(
            name, value, label, selected, index, subindex=subindex, attrs=attrs
        )
        year_id = self.year_for.get(str(getattr(value, 'value', value)))
        if year_id:
            option['attrs']['data-year'] = str(year_id)
        return option
