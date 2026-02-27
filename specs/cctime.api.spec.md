
# Назначение

Данный файл описывает контракт модели данных используемые для взаимодействия ui с api в системе управления расписанием занятости специалистов по времени и кабинетам.

# Соглашения

- Все запросы (Query и Command) выполняются через `POST`
- Все параметры передаются через body (JSON)
- После успешного SaveReserve клиент должен повторно запросить `GetReservesForDate` для обновления данных на экране
- Все справочники возвращаются отсортированными по `orderIndex` (по возрастанию). UI использует этот порядок для отображения

# Endpoints

## GetReferences

GetReferencesQuery:
```json
{}
```

GetReferencesQueryResult:

> Возвращает только не архивных специалистов и клиентов (`isArchived = false`). Используется на странице расписания для выпадающих списков в резервациях.

```json
{
    "specialists": [
        { "id": "UUID", "name": "string", "orderIndex": 0 }
    ],
    "clients": [
        { "id": "UUID", "name": "string", "orderIndex": 0 }
    ],
    "rooms": [
        { "id": "UUID", "name": "string", "orderIndex": 0 }
    ],
    "timeSlots": [
        { "id": "UUID", "name": "string", "type": "string", "orderIndex": 0 }
    ]
}
```


## GetReservesForDate

GetReservesForDateQuery: 
```json
{
    "date": "YYYY-MM-DD"
}
```

GetReservesForDateQueryResult:
```json
{
    "reserves": [
        {
            "id": "UUID",
            "date": "YYYY-MM-DD",
            "timeSlotId": "UUID",
            "roomId": "UUID",
            "clientId": "UUID",
            "clientConfirmed": "boolean",
            "specialistId": "UUID",
            "specialistConfirmed": "boolean"
        }
    ]
}
```

## SaveReserve

SaveReserveCommand:
```json
{
    "id": "UUID | null",
    "date": "YYYY-MM-DD",
    "timeSlotId": "UUID",
    "roomId": "UUID",
    "clientId": "UUID",
    "clientConfirmed": false,
    "clientRepeats": 0,
    "specialistId": "UUID",
    "specialistConfirmed": false,
    "specialistRepeats": 0
}
```

SaveReserveCommandResult:
```json
{
    "id": "UUID | null",
    "errors": [
        {
            "code": "string",
            "message": "string"
        }
    ]
}
```

- `id` — UUID созданного/обновлённого резерва при успехе. При ошибке: null если это было создание, UUID редактируемого резерва если это было редактирование.
- `errors` — пустой массив при успехе, список ошибок при неудаче (например, конфликты тиражирования).

## GetSpecialists

GetSpecialistsQuery:
```json
{}
```

GetSpecialistsQueryResult:

> Возвращает полный список специалистов, включая архивных. Используется на странице управления специалистами.

```json
{
    "specialists": [
        { "id": "UUID", "name": "string", "orderIndex": 0, "isArchived": false }
    ]
}
```

## SaveSpecialist

SaveSpecialistCommand:
```json
{
    "id": "UUID | null",
    "name": "string",
    "orderIndex": 0,
    "isArchived": false
}
```

SaveSpecialistCommandResult:
```json
{
    "id": "UUID",
    "errors": [
        {
            "code": "string",
            "message": "string"
        }
    ]
}
```

- `id` — UUID созданного/обновлённого специалиста при успехе. При создании (`id = null` в запросе) возвращается сгенерированный UUID.
- `errors` — пустой массив при успехе.

## GetClients

GetClientsQuery:
```json
{}
```

GetClientsQueryResult:

> Возвращает полный список клиентов, включая архивных. Используется на странице управления клиентами.

```json
{
    "clients": [
        { "id": "UUID", "name": "string", "orderIndex": 0, "isArchived": false }
    ]
}
```

## SaveClient

SaveClientCommand:
```json
{
    "id": "UUID | null",
    "name": "string",
    "orderIndex": 0,
    "isArchived": false
}
```

SaveClientCommandResult:
```json
{
    "id": "UUID",
    "errors": [
        {
            "code": "string",
            "message": "string"
        }
    ]
}
```

- `id` — UUID созданного/обновлённого клиента при успехе. При создании (`id = null` в запросе) возвращается сгенерированный UUID.
- `errors` — пустой массив при успехе.
