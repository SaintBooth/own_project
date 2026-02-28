"""Custom User manager."""
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):  # type: ignore[type-arg]
    def create_user(
        self,
        username: str,
        email: str | None = None,
        password: str | None = None,
        **extra_fields: object,
    ) -> "User":  # type: ignore[name-defined]  # noqa: F821
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        if email:
            email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user  # type: ignore[return-value]

    def create_superuser(
        self,
        username: str,
        email: str | None = None,
        password: str | None = None,
        **extra_fields: object,
    ) -> "User":  # type: ignore[name-defined]  # noqa: F821
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields["role"] = "SUPERADMIN"
        return self.create_user(username, email, password, **extra_fields)
