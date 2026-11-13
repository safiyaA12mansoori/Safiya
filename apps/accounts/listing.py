from django.conf import settings
from django.core.paginator import Paginator


def search_term(request):
    return request.GET.get('q', '').strip()[:100]


def query_suffix(request):
    params = request.GET.copy()
    params.pop('page', None)
    encoded = params.urlencode()
    return f'{encoded}&' if encoded else ''


def paginate(request, queryset):
    paginator = Paginator(queryset, settings.LIST_PAGE_SIZE)
    return paginator.get_page(request.GET.get('page'))


def page_window(page, radius=2):
    last = page.paginator.num_pages
    current = page.number
    wanted = {1, last}
    for number in range(current - radius, current + radius + 1):
        if 1 <= number <= last:
            wanted.add(number)
    items = []
    previous = 0
    for number in sorted(wanted):
        if previous and number - previous > 1:
            items.append(None)
        items.append(number)
        previous = number
    return items


def list_context(request, page, **extra):
    context = {
        'page': page,
        'query': search_term(request),
        'query_suffix': query_suffix(request),
        'page_numbers': page_window(page),
    }
    context.update(extra)
    return context
