def stash_credentials(request, *, title, username, password, note):
    request.session['credential_reveal'] = {
        'title': title,
        'username': username,
        'password': password,
        'note': note,
    }


CREDENTIAL_NOTE = (
    'This password is stored only as a hash. Copy it now; it will not be shown again.'
)
