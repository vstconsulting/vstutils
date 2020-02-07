// {% extends "gui/app-loader.js" %}
// {% load request_static %}
// {% block resource_list %}
let resourceList = [
    // {% for file in static_files_list %}
        // {% if file.api %}
            { priority: Number('{{ file.priority }}'), type: '{{ file.type }}', name: '{% static file.name %}?v={{gui_version}}'},
        // {% endif %}
    // {% endfor %}
];
// {% endblock %}