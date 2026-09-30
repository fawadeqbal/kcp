// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SubscriptionDtoCWProxy {
  SubscriptionDto id(String id);

  SubscriptionDto planKey(String planKey);

  SubscriptionDto provider(SubscriptionDtoProviderEnum provider);

  SubscriptionDto status(SubscriptionDtoStatusEnum status);

  SubscriptionDto currency(String currency);

  SubscriptionDto amountMinor(num amountMinor);

  SubscriptionDto children(num children);

  SubscriptionDto currentPeriodStart(DateTime currentPeriodStart);

  SubscriptionDto currentPeriodEnd(DateTime currentPeriodEnd);

  SubscriptionDto cancelAtPeriodEnd(bool cancelAtPeriodEnd);

  SubscriptionDto canceledAt(DateTime? canceledAt);

  SubscriptionDto endedAt(DateTime? endedAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubscriptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubscriptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubscriptionDto call({
    String id,
    String planKey,
    SubscriptionDtoProviderEnum provider,
    SubscriptionDtoStatusEnum status,
    String currency,
    num amountMinor,
    num children,
    DateTime currentPeriodStart,
    DateTime currentPeriodEnd,
    bool cancelAtPeriodEnd,
    DateTime? canceledAt,
    DateTime? endedAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSubscriptionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSubscriptionDto.copyWith.fieldName(...)`
class _$SubscriptionDtoCWProxyImpl implements _$SubscriptionDtoCWProxy {
  const _$SubscriptionDtoCWProxyImpl(this._value);

  final SubscriptionDto _value;

  @override
  SubscriptionDto id(String id) => this(id: id);

  @override
  SubscriptionDto planKey(String planKey) => this(planKey: planKey);

  @override
  SubscriptionDto provider(SubscriptionDtoProviderEnum provider) =>
      this(provider: provider);

  @override
  SubscriptionDto status(SubscriptionDtoStatusEnum status) =>
      this(status: status);

  @override
  SubscriptionDto currency(String currency) => this(currency: currency);

  @override
  SubscriptionDto amountMinor(num amountMinor) =>
      this(amountMinor: amountMinor);

  @override
  SubscriptionDto children(num children) => this(children: children);

  @override
  SubscriptionDto currentPeriodStart(DateTime currentPeriodStart) =>
      this(currentPeriodStart: currentPeriodStart);

  @override
  SubscriptionDto currentPeriodEnd(DateTime currentPeriodEnd) =>
      this(currentPeriodEnd: currentPeriodEnd);

  @override
  SubscriptionDto cancelAtPeriodEnd(bool cancelAtPeriodEnd) =>
      this(cancelAtPeriodEnd: cancelAtPeriodEnd);

  @override
  SubscriptionDto canceledAt(DateTime? canceledAt) =>
      this(canceledAt: canceledAt);

  @override
  SubscriptionDto endedAt(DateTime? endedAt) => this(endedAt: endedAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubscriptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubscriptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubscriptionDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? planKey = const $CopyWithPlaceholder(),
    Object? provider = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
    Object? currency = const $CopyWithPlaceholder(),
    Object? amountMinor = const $CopyWithPlaceholder(),
    Object? children = const $CopyWithPlaceholder(),
    Object? currentPeriodStart = const $CopyWithPlaceholder(),
    Object? currentPeriodEnd = const $CopyWithPlaceholder(),
    Object? cancelAtPeriodEnd = const $CopyWithPlaceholder(),
    Object? canceledAt = const $CopyWithPlaceholder(),
    Object? endedAt = const $CopyWithPlaceholder(),
  }) {
    return SubscriptionDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      planKey: planKey == const $CopyWithPlaceholder()
          ? _value.planKey
          // ignore: cast_nullable_to_non_nullable
          : planKey as String,
      provider: provider == const $CopyWithPlaceholder()
          ? _value.provider
          // ignore: cast_nullable_to_non_nullable
          : provider as SubscriptionDtoProviderEnum,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as SubscriptionDtoStatusEnum,
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String,
      amountMinor: amountMinor == const $CopyWithPlaceholder()
          ? _value.amountMinor
          // ignore: cast_nullable_to_non_nullable
          : amountMinor as num,
      children: children == const $CopyWithPlaceholder()
          ? _value.children
          // ignore: cast_nullable_to_non_nullable
          : children as num,
      currentPeriodStart: currentPeriodStart == const $CopyWithPlaceholder()
          ? _value.currentPeriodStart
          // ignore: cast_nullable_to_non_nullable
          : currentPeriodStart as DateTime,
      currentPeriodEnd: currentPeriodEnd == const $CopyWithPlaceholder()
          ? _value.currentPeriodEnd
          // ignore: cast_nullable_to_non_nullable
          : currentPeriodEnd as DateTime,
      cancelAtPeriodEnd: cancelAtPeriodEnd == const $CopyWithPlaceholder()
          ? _value.cancelAtPeriodEnd
          // ignore: cast_nullable_to_non_nullable
          : cancelAtPeriodEnd as bool,
      canceledAt: canceledAt == const $CopyWithPlaceholder()
          ? _value.canceledAt
          // ignore: cast_nullable_to_non_nullable
          : canceledAt as DateTime?,
      endedAt: endedAt == const $CopyWithPlaceholder()
          ? _value.endedAt
          // ignore: cast_nullable_to_non_nullable
          : endedAt as DateTime?,
    );
  }
}

extension $SubscriptionDtoCopyWith on SubscriptionDto {
  /// Returns a callable class that can be used as follows: `instanceOfSubscriptionDto.copyWith(...)` or like so:`instanceOfSubscriptionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SubscriptionDtoCWProxy get copyWith => _$SubscriptionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SubscriptionDto _$SubscriptionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SubscriptionDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'planKey',
          'provider',
          'status',
          'currency',
          'amountMinor',
          'children',
          'currentPeriodStart',
          'currentPeriodEnd',
          'cancelAtPeriodEnd',
          'canceledAt',
          'endedAt',
        ],
      );
      final val = SubscriptionDto(
        id: $checkedConvert('id', (v) => v as String),
        planKey: $checkedConvert('planKey', (v) => v as String),
        provider: $checkedConvert(
          'provider',
          (v) => $enumDecode(
            _$SubscriptionDtoProviderEnumEnumMap,
            v,
            unknownValue: SubscriptionDtoProviderEnum.unknownDefaultOpenApi,
          ),
        ),
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$SubscriptionDtoStatusEnumEnumMap,
            v,
            unknownValue: SubscriptionDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
        currency: $checkedConvert('currency', (v) => v as String),
        amountMinor: $checkedConvert('amountMinor', (v) => v as num),
        children: $checkedConvert('children', (v) => v as num),
        currentPeriodStart: $checkedConvert(
          'currentPeriodStart',
          (v) => DateTime.parse(v as String),
        ),
        currentPeriodEnd: $checkedConvert(
          'currentPeriodEnd',
          (v) => DateTime.parse(v as String),
        ),
        cancelAtPeriodEnd: $checkedConvert(
          'cancelAtPeriodEnd',
          (v) => v as bool,
        ),
        canceledAt: $checkedConvert(
          'canceledAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        endedAt: $checkedConvert(
          'endedAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SubscriptionDtoToJson(SubscriptionDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'planKey': instance.planKey,
      'provider': _$SubscriptionDtoProviderEnumEnumMap[instance.provider]!,
      'status': _$SubscriptionDtoStatusEnumEnumMap[instance.status]!,
      'currency': instance.currency,
      'amountMinor': instance.amountMinor,
      'children': instance.children,
      'currentPeriodStart': instance.currentPeriodStart.toIso8601String(),
      'currentPeriodEnd': instance.currentPeriodEnd.toIso8601String(),
      'cancelAtPeriodEnd': instance.cancelAtPeriodEnd,
      'canceledAt': instance.canceledAt?.toIso8601String(),
      'endedAt': instance.endedAt?.toIso8601String(),
    };

const _$SubscriptionDtoProviderEnumEnumMap = {
  SubscriptionDtoProviderEnum.MANUAL: 'MANUAL',
  SubscriptionDtoProviderEnum.STRIPE: 'STRIPE',
  SubscriptionDtoProviderEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$SubscriptionDtoStatusEnumEnumMap = {
  SubscriptionDtoStatusEnum.ACTIVE: 'ACTIVE',
  SubscriptionDtoStatusEnum.PAST_DUE: 'PAST_DUE',
  SubscriptionDtoStatusEnum.CANCELED: 'CANCELED',
  SubscriptionDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
