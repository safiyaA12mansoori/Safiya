from django.http import FileResponse, Http404


def send_file(field):
    if not field:
        raise Http404("File not found.")
    name = field.name.rsplit("/", 1)[-1]
    return FileResponse(field.open("rb"), as_attachment=True, filename=name)
