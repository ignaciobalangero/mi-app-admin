# Reglas Firestore — bloque Zinguería (pegar en consola)

> **IMPORTANTE:** Las reglas de GestiOne viven en la consola de Firebase.
> MERGE este bloque al desplegar. No borrar reglas existentes.
> No actualizar `firebase.json` → `firestore.rules` para evitar wipe accidental.

## Dónde pegarlo

1. [Firebase Console](https://console.firebase.google.com) → proyecto **ingresos-trabajos**
2. **Firestore Database** → pestaña **Rules**
3. Buscá el final, justo **antes** del último `}` que cierra `match /databases/{database}/documents`
4. Pegá el bloque de abajo (después de `match /negocios/{negocioID}/{path=**} { ... }`)
5. Tocá **Publish**

Tu archivo debe terminar así:

```
    match /negocios/{negocioID}/{path=**} {
      allow read, write: if esPropietarioDelNegocio(negocioID);
      allow read, write: if request.auth.uid == "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";
    }

    // ========== ZINGUERÍA (desde acá) ==========
    ...bloque...
    // ========== fin ZINGUERÍA ==========

  }   // <-- este cierra databases/documents
}     // <-- este cierra service
```

## Bloque a pegar

```
    // ========== ZINGUERÍA (módulo aislado) ==========
    // Path: Zingueria/app/{users|clientes|trabajos|materiales}/...

    function hasZingueriaAccess() {
      return request.auth != null
        && exists(/databases/$(database)/documents/Zingueria/app/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/Zingueria/app/users/$(request.auth.uid)).data.activo == true;
    }

    match /Zingueria/app/users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.ownerUid == uid
        && request.resource.data.activo == true;
      allow update: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;
    }

    match /Zingueria/app/clientes/{id} {
      allow read: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;
      allow create: if hasZingueriaAccess() && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;
    }

    match /Zingueria/app/trabajos/{id} {
      allow read: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;
      allow create: if hasZingueriaAccess() && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;

      match /medidas/{medidaId} {
        allow read, write: if hasZingueriaAccess()
          && get(/databases/$(database)/documents/Zingueria/app/trabajos/$(id)).data.ownerUid == request.auth.uid;
      }
      match /fotos/{fotoId} {
        allow read, write: if hasZingueriaAccess()
          && get(/databases/$(database)/documents/Zingueria/app/trabajos/$(id)).data.ownerUid == request.auth.uid;
      }
      match /pagos/{pagoId} {
        allow read, write: if hasZingueriaAccess()
          && get(/databases/$(database)/documents/Zingueria/app/trabajos/$(id)).data.ownerUid == request.auth.uid;
      }
    }

    match /Zingueria/app/materiales/{id} {
      allow read: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;
      allow create: if hasZingueriaAccess() && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if hasZingueriaAccess() && resource.data.ownerUid == request.auth.uid;

      match /movimientos/{movId} {
        allow read, write: if hasZingueriaAccess()
          && get(/databases/$(database)/documents/Zingueria/app/materiales/$(id)).data.ownerUid == request.auth.uid;
      }
    }
    // ========== fin ZINGUERÍA ==========
```

## Cómo verificar

En Rules, buscá con Ctrl/Cmd+F la palabra `Zingueria`. Tiene que aparecer.
Si no aparece → no se publicó y vas a seguir viendo `permission-denied`.

## Storage (fotos)

En **Storage → Rules**, tiene que existir (sin borrar el resto de GestiOne):

```
match /Zingueria/{uid}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
