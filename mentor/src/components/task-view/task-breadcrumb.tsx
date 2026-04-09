"use client";

import React from "react";
import { useTaskStore } from "@/stores/task-store";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function TaskBreadcrumb() {
  const { parentPath, navigateTo, navigateToRoot } = useTaskStore();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {parentPath.length === 0 ? (
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => navigateToRoot()}
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {parentPath.map((segment, index) => (
              <React.Fragment key={segment.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === parentPath.length - 1 ? (
                    <BreadcrumbPage>{segment.description}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => navigateTo(index)}
                    >
                      {segment.description}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
