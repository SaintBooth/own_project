# Generated migration — PromptSpace Sprint 0 (B0-4)
# Models: User, SellerProfile, ApiKey
# Source: apps/users/models.py

import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="last login"
                    ),
                ),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                (
                    "email",
                    models.EmailField(
                        blank=True,
                        max_length=254,
                        null=True,
                        unique=True,
                        verbose_name="email address",
                    ),
                ),
                ("username", models.CharField(max_length=50, unique=True)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("BUYER", "Покупатель"),
                            ("SELLER", "Продавец"),
                            ("MODERATOR", "Модератор"),
                            ("SUPERADMIN", "Суперадмин"),
                        ],
                        default="BUYER",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("consent_pd_at", models.DateTimeField(blank=True, null=True)),
                (
                    "avatar_object_key",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now, editable=False),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "verbose_name": "Пользователь",
                "verbose_name_plural": "Пользователи",
            },
        ),
        migrations.CreateModel(
            name="SellerProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="seller_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("inn", models.CharField(db_index=True, max_length=12)),
                (
                    "legal_type",
                    models.CharField(
                        choices=[
                            ("IP", "Индивидуальный предприниматель"),
                            ("SELF_EMPLOYED", "Самозанятый"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "kyc_status",
                    models.CharField(
                        choices=[
                            ("PENDING", "На проверке"),
                            ("VERIFIED", "Верифицирован"),
                            ("REJECTED", "Отклонён"),
                            ("CANCELLED", "Отменён (потеря НПД/ИП)"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("kyc_verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "kyc_rejected_reason",
                    models.TextField(blank=True, default=""),
                ),
                (
                    "bio",
                    models.TextField(blank=True, default="", max_length=500),
                ),
                ("avatar_url", models.URLField(blank=True, null=True)),
                (
                    "robokassa_split_id",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now, editable=False),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Профиль продавца",
                "verbose_name_plural": "Профили продавцов",
            },
        ),
        migrations.CreateModel(
            name="ApiKey",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("key_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now, editable=False),
                ),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "API ключ",
                "verbose_name_plural": "API ключи",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["username"], name="users_user_username_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(
                fields=["is_deleted", "is_active"],
                name="users_user_deleted_active_idx",
            ),
        ),
    ]
