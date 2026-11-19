#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "JUJUExplorerPawn.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UCapsuleComponent;

UCLASS()
class JUJUWORLDUE_API AJUJUExplorerPawn : public APawn
{
    GENERATED_BODY()

public:
    AJUJUExplorerPawn();

protected:
    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);

    UPROPERTY(VisibleAnywhere, Category="Components")
    UCapsuleComponent* Capsule;

    UPROPERTY(VisibleAnywhere, Category="Components")
    USpringArmComponent* CameraBoom;

    UPROPERTY(VisibleAnywhere, Category="Components")
    UCameraComponent* Camera;
};
