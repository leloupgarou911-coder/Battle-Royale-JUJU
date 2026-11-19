#include "JUJUExplorerPawn.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/FloatingPawnMovement.h"
#include "GameFramework/PlayerController.h"
#include "Components/InputComponent.h"

AJUJUExplorerPawn::AJUJUExplorerPawn()
{
    PrimaryActorTick.bCanEverTick = false;

    Capsule = CreateDefaultSubobject<UCapsuleComponent>(TEXT("Capsule"));
    Capsule->InitCapsuleSize(42.f, 96.f);
    RootComponent = Capsule;

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 320.f;
    CameraBoom->SetRelativeLocation(FVector(0.f, 0.f, 70.f));
    CameraBoom->bUsePawnControlRotation = true;

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    Camera->bUsePawnControlRotation = false;

    auto* Movement = CreateDefaultSubobject<UFloatingPawnMovement>(TEXT("Movement"));
    Movement->MaxSpeed = 600.f;
    Movement->Acceleration = 1200.f;
    Movement->Deceleration = 1600.f;
    Movement->TurningBoost = 8.f;

    AutoPossessPlayer = EAutoReceiveInput::Player0;
}

void AJUJUExplorerPawn::BeginPlay()
{
    Super::BeginPlay();
}

void AJUJUExplorerPawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    PlayerInputComponent->BindAxis("MoveForward", this, &AJUJUExplorerPawn::MoveForward);
    PlayerInputComponent->BindAxis("MoveRight", this, &AJUJUExplorerPawn::MoveRight);
    PlayerInputComponent->BindAxis("Turn", this, &AJUJUExplorerPawn::Turn);
    PlayerInputComponent->BindAxis("LookUp", this, &AJUJUExplorerPawn::LookUp);
}

void AJUJUExplorerPawn::MoveForward(float Value)
{
    if (Controller && FMath::Abs(Value) > KINDA_SMALL_NUMBER)
        AddMovementInput(GetActorForwardVector(), Value);
}

void AJUJUExplorerPawn::MoveRight(float Value)
{
    if (Controller && FMath::Abs(Value) > KINDA_SMALL_NUMBER)
        AddMovementInput(GetActorRightVector(), Value);
}

void AJUJUExplorerPawn::Turn(float Value)
{
    AddControllerYawInput(Value);
}

void AJUJUExplorerPawn::LookUp(float Value)
{
    AddControllerPitchInput(Value);
}
